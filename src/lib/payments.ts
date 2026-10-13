import { pickRecord, pickString } from './fields';

const URL_KEYS = ['PaymentUrl', 'PaymentLink', 'CheckoutUrl', 'ShortUrl', 'short_url', 'RedirectUrl', 'Url', 'Link'];

/**
 * Finds a hosted-checkout URL in a createPaymentOrder response. Only https URLs are accepted so
 * the investor is never sent to a cleartext payment page.
 */
export function findPaymentUrl(data: unknown): string | null {
  const candidates = [data, pickRecord(data, 'Order', 'Payment', 'Data')];
  for (const source of candidates) {
    const url = pickString(source, ...URL_KEYS);
    if (url && /^https:\/\//i.test(url)) return url;
  }
  return null;
}

export function paymentStatusLabel(data: unknown): string | null {
  return pickString(data, 'PaymentStatus', 'Status', 'OrderStatus', 'State') ?? null;
}

export function isPaid(status: string | null | undefined): boolean {
  return /^(paid|success|successful|captured|completed)$/i.test((status ?? '').trim());
}
