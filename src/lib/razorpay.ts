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
