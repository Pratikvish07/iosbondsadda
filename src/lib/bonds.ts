import type { Product } from '@/store/api/types';

import { clean } from './format';

/** "8.88% MUTHOOT FINCORP LIMITED 2032" -> "Muthoot Fincorp Limited". */
export function issuerName(product: Pick<Product, 'ProductName' | 'Security'>): string {
  const raw = clean(product.ProductName || product.Security);
  const stripped = raw
    .replace(/^\s*\d+(\.\d+)?\s*%\s*/, '')
    .replace(/\s+(19|20)\d{2}\s*$/, '')
    .trim();
  const name = stripped || raw;
  // Title-case names the server sends in ALL CAPS; leave mixed case untouched.
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

/** Investment-grade ratings (AAA..BBB-) are shown green, sub-investment grade amber. */
export function ratingTone(rating: string | null | undefined): 'success' | 'warning' | 'neutral' {
  const r = clean(rating).toUpperCase();
  if (!r) return 'neutral';
  return /^(AAA|AA|A)(?![A-Z])/.test(r.replace(/\s/g, '')) ? 'success' : 'warning';
}
