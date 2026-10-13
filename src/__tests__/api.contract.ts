/**
 * Live contract tests against the real MobileApiJson.ashx. They only call read-only, public actions
 * (no login, no writes, no real customer ids), so they are safe to run against production.
 *
 *   npm run test:api
 *
 * Excluded from `npm test` so CI and offline runs stay deterministic.
 */
import type { BaseQueryApi } from '@reduxjs/toolkit/query';

import { apiBaseQuery, type ApiRequest } from '@/store/api/baseQuery';
import type { Category, InvestmentPreview, KycStatus, ProductDetail, ProductPage } from '@/store/api/types';

const api: BaseQueryApi = {
  signal: new AbortController().signal,
  abort: () => {},
  dispatch: () => undefined as never,
  getState: () => ({ auth: { session: null } }),
  extra: undefined,
  endpoint: 'contract',
  type: 'query',
};

async function call<T>(request: ApiRequest): Promise<T> {
  const result = await apiBaseQuery(request, api, {});
  if (result.error) throw new Error(`${request.action}: ${JSON.stringify(result.error)}`);
  return result.data as T;
}

// Customer id 0 never exists; endpoints answer with empty/default payloads for it.
const NO_CUSTOMER = '0';

describe('MobileApiJson.ashx contract', () => {
  let firstProductId = '';

  it('categories returns CategoryId/CategoryName pairs', async () => {
    const data = await call<Category[]>({ action: 'categories' });
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toEqual(expect.objectContaining({ CategoryId: expect.any(String), CategoryName: expect.any(String) }));
  });

  it('products returns a page of products with string-encoded numbers and dd/MM/yyyy dates', async () => {
    const page = await call<ProductPage>({ action: 'products', params: { pageIndex: 1, pageSize: 5 } });
    expect(page).toEqual(expect.objectContaining({ PageIndex: 1, TotalRecords: expect.any(Number) }));
    expect(page.Products.length).toBeGreaterThan(0);
    const p = page.Products[0];
    firstProductId = p.ProductId;
    expect(p.FaceValue).toMatch(/^\d+(\.\d+)?$/);
    expect(p.CouponRate).toMatch(/^\d+(\.\d+)?$/);
    expect(p.MaturityDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('productDetail wraps the product with issuer metadata', async () => {
    const detail = await call<ProductDetail>({
      action: 'productDetail',
      params: { productId: firstProductId, customerId: NO_CUSTOMER },
    });
    expect(detail.Product.ProductId).toBe(firstProductId);
    expect(Array.isArray(detail.FAQs)).toBe(true);
  });

  it('investmentPreview gates investing on KYC', async () => {
    const preview = await call<InvestmentPreview>({
      action: 'investmentPreview',
      params: { productId: firstProductId, customerId: NO_CUSTOMER },
    });
    expect(typeof preview.CanInvestNow).toBe('boolean');
    expect(preview.CanInvestNow).toBe(false);
  });

  it('kycStatus exposes per-document statuses', async () => {
    const kyc = await call<KycStatus>({ action: 'kycStatus', params: { customerId: NO_CUSTOMER } });
    expect(kyc).toEqual(expect.objectContaining({ OverallStatus: expect.any(String) }));
    expect(kyc).toHaveProperty('BankStatus');
  });

  it('reports failures as Success:false with a message', async () => {
    const result = await apiBaseQuery({ action: 'profile', params: { customerId: NO_CUSTOMER } }, api, {});
    expect(result.error).toMatchObject({ status: 'CUSTOM_ERROR', error: expect.any(String) });
  });
});
