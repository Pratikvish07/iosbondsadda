import { useCallback, useMemo } from 'react';

import { issuerName } from '@/lib/bonds';
import { useProductsQuery } from '@/store/api/bondsAddaApi';

const CATALOGUE = { pageIndex: 1, pageSize: 200 } as const;

const normaliseIsin = (isin: string | null | undefined) => (isin ?? '').trim().toUpperCase();

/**
 * Deals, holdings and payments carry no ImageUrl; only the product catalogue does. This loads the
 * catalogue once (RTK Query caches it) and returns a lookup by ISIN, falling back to the issuer
 * name so a different issue from the same issuer still gets its logo.
 */
export function useBondLogos() {
  const { data } = useProductsQuery(CATALOGUE);

  const index = useMemo(() => {
    const byIsin = new Map<string, string>();
    const byIssuer = new Map<string, string>();
    for (const p of data?.Products ?? []) {
      if (!p.ImageUrl) continue;
      byIsin.set(normaliseIsin(p.ISINNumber), p.ImageUrl);
      const issuer = issuerName(p).toLowerCase();
      if (!byIssuer.has(issuer)) byIssuer.set(issuer, p.ImageUrl);
    }
    return { byIsin, byIssuer };
  }, [data]);

  return useCallback(
    (isin: string | null | undefined, name: string): string | null =>
      index.byIsin.get(normaliseIsin(isin)) ?? index.byIssuer.get(name.toLowerCase()) ?? null,
    [index],
  );
}
