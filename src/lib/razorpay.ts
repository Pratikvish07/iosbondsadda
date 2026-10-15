import { BRAND_MARK_DATA_URI } from '@/config/brandMark';

import { pickString } from './fields';

/** Razorpay order returned by `createPaymentOrder` (verified against the live API). */
export interface RazorpayOrder {
  orderId: string;
  /** Public key id (rzp_live_… / rzp_test_…). Safe to ship to clients; the secret never is. */
  keyId: string;
  /** Amount in paise, exactly as the server computed it. Never recompute this on the client. */
  amountInPaise: number;
  currency: string;
  customerName?: string;
  email?: string;
  mobile?: string;
  dealId?: string;
}

export type RazorpayResult =
  | { status: 'success'; paymentId: string; orderId: string; signature: string }
  | { status: 'dismissed' }
  | { status: 'failed'; message: string };

export function parseRazorpayOrder(data: unknown): RazorpayOrder | null {
  const orderId = pickString(data, 'RazorpayOrderId', 'OrderId', 'order_id');
  const keyId = pickString(data, 'RazorpayKeyId', 'KeyId', 'key_id');
  const paise = Number(pickString(data, 'AmountInPaise', 'amount'));
  if (!orderId || !keyId || !Number.isInteger(paise) || paise <= 0) return null;
  return {
    orderId,
    keyId,
    amountInPaise: paise,
    currency: pickString(data, 'Currency') ?? 'INR',
    customerName: pickString(data, 'CustomerName'),
    email: pickString(data, 'Email'),
    // Razorpay rejects malformed contacts in prefill; only pass a plausible Indian mobile.
    mobile: (() => {
      const digits = (pickString(data, 'Mobile') ?? '').replace(/\D/g, '').slice(-10);
      return /^[6-9]\d{9}$/.test(digits) ? digits : undefined;
    })(),
    dealId: pickString(data, 'DealId'),
  };
}

/** Checkout options shared by the web and native integrations (handlers are attached per platform). */
export function checkoutOptions(order: RazorpayOrder, description: string) {
  return {
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amountInPaise,
    currency: order.currency,
    name: 'BondsAdda',
    image: BRAND_MARK_DATA_URI,
    description,
    prefill: {
      name: order.customerName ?? '',
      email: order.email ?? '',
      contact: order.mobile ?? '',
    },
    notes: order.dealId ? { deal_id: order.dealId } : undefined,
    theme: { color: '#0F2A47' },
    retry: { enabled: true },
  };
}

export const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Android UPI apps are launched with `intent://host/path#Intent;scheme=upi;package=…;end`, which
 * Linking cannot open directly. Rebuild it as `upi://host/path` (or use the fallback URL).
 */
export function resolveIntentUrl(url: string): string | null {
  if (!/^intent:/i.test(url)) return url;
  const [target, fragment = ''] = url.slice('intent:'.length).split('#Intent;');
  const params = Object.fromEntries(
    fragment
      .split(';')
      .filter((part) => part.includes('='))
      .map((part) => {
        const i = part.indexOf('=');
        return [part.slice(0, i), part.slice(i + 1)];
      }),
  );
  if (params.scheme) return `${params.scheme}:${target}`;
  if (params['S.browser_fallback_url']) return decodeURIComponent(params['S.browser_fallback_url']);
  return null;
}
