import { useEffect, useRef } from 'react';

import { checkoutOptions, RAZORPAY_SCRIPT, type RazorpayResult } from '@/lib/razorpay';

import type { RazorpayCheckoutProps } from './RazorpayCheckout';

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (r: { error?: { description?: string } }) => void): void;
}
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let scriptPromise: Promise<RazorpayCtor> | null = null;

/** Loads Razorpay's checkout.js once per page. */
function loadRazorpay(): Promise<RazorpayCtor> {
  const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error('Razorpay unavailable'));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Razorpay script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Web Razorpay Checkout: the official checkout.js overlay, opened whenever `order` is set. */
export function RazorpayCheckout({ order, description, onResult }: RazorpayCheckoutProps) {
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!order) return;
    let settled = false;
    const finish = (result: RazorpayResult) => {
      if (settled) return;
      settled = true;
      onResultRef.current(result);
    };

    loadRazorpay()
      .then((Razorpay) => {
        const rzp = new Razorpay({
          ...checkoutOptions(order, description),
          handler: (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) =>
            finish({
              status: 'success',
              paymentId: r.razorpay_payment_id,
              orderId: r.razorpay_order_id,
              signature: r.razorpay_signature,
            }),
          modal: { ondismiss: () => finish({ status: 'dismissed' }), confirm_close: true },
        });
        rzp.on('payment.failed', (r) => finish({ status: 'failed', message: r.error?.description ?? 'Payment failed.' }));
        rzp.open();
      })
      .catch(() =>
        finish({ status: 'failed', message: 'Could not load the payment page. Check your connection and try again.' }),
      );
  }, [order, description]);

  return null;
}
