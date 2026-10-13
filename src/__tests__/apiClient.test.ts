import type { BaseQueryApi } from '@reduxjs/toolkit/query';

import { findPaymentUrl, isPaid } from '@/lib/payments';
import { sessionFromAuthPayload } from '@/lib/secureSession';
import { apiBaseQuery, getErrorMessage } from '@/store/api/baseQuery';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function api(token: string | null = null): BaseQueryApi {
  return {
    signal: new AbortController().signal,
    abort: jest.fn(),
    dispatch: jest.fn(),
    getState: () => ({ auth: { session: token ? { token } : null } }),
    extra: undefined,
    endpoint: 'test',
    type: 'query',
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const urlOf = (call: number) => fetchMock.mock.calls[call][0] as string;
const initOf = (call: number) => fetchMock.mock.calls[call][1] as RequestInit & { headers: Record<string, string> };

describe('apiBaseQuery', () => {
  it('unwraps Data and exposes the server message', async () => {
    fetchMock.mockResolvedValueOnce(json({ Success: true, Message: 'ok', Data: [{ CategoryId: '1' }] }));
    const result = await apiBaseQuery({ action: 'categories' }, api(), {});
    expect(result.data).toEqual([{ CategoryId: '1' }]);
    expect(result.meta?.message).toBe('ok');
    expect(urlOf(0)).toBe('https://bondsadda.com/MobileApiJson.ashx?action=categories');
  });

  it('encodes params and drops empty values', async () => {
    fetchMock.mockResolvedValueOnce(json({ Success: true, Message: '', Data: null }));
    await apiBaseQuery(
      { action: 'products', params: { pageIndex: 1, categoryId: '', searchText: 'a&b' } },
      api(),
      {},
    );
    expect(urlOf(0)).toBe(
      'https://bondsadda.com/MobileApiJson.ashx?action=products&pageIndex=1&searchText=a%26b',
    );
  });

  it('turns Success:false (sent with HTTP 200) into an error carrying the message', async () => {
    fetchMock.mockResolvedValueOnce(json({ Success: false, Message: 'Customer not found.', Data: null }));
    const result = await apiBaseQuery({ action: 'login', method: 'POST', body: {} }, api(), {});
    expect(result.error).toMatchObject({ status: 'CUSTOM_ERROR', error: 'Customer not found.' });
    expect(getErrorMessage(result.error)).toBe('Customer not found.');
  });

  it('reports HTML error pages as parsing errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>404</html>', { status: 200 }));
    const result = await apiBaseQuery({ action: 'nonsense' }, api(), {});
    expect(result.error?.status).toBe('PARSING_ERROR');
  });

  it('sends JSON bodies and the bearer token on POST', async () => {
    fetchMock.mockResolvedValueOnce(json({ Success: true, Message: '', Data: {} }));
    await apiBaseQuery({ action: 'submitBank', method: 'POST', body: { customerId: '1' } }, api('tkn'), {});
    const init = initOf(0);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tkn');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"customerId":"1"}');
  });

  it('retries GETs on network failure', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(json({ Success: true, Message: '', Data: 1 }));
    const result = await apiBaseQuery({ action: 'categories' }, api(), {});
    expect(result.data).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never retries POSTs (deal and payment creation are not idempotent)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const result = await apiBaseQuery({ action: 'createDeal', method: 'POST', body: {} }, api(), {});
    expect(result.error?.status).toBe('FETCH_ERROR');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getErrorMessage(result.error)).toMatch(/internet connection/);
  });
});

describe('sessionFromAuthPayload', () => {
  it('reads a flat payload', () => {
    expect(sessionFromAuthPayload({ CustomerId: 1416, FullName: 'Test User', Token: 'abc' }, 'test@example.com')).toEqual({
      customerId: '1416',
      token: 'abc',
      fullName: 'Test User',
      email: 'test@example.com',
      mobile: null,
    });
  });

  it('reads a nested Customer object and falls back to the login mobile', () => {
    const s = sessionFromAuthPayload({ Customer: { customerID: '7' } }, '9999999999');
    expect(s?.customerId).toBe('7');
    expect(s?.mobile).toBe('9999999999');
  });

  it('rejects payloads without a customer id', () => {
    expect(sessionFromAuthPayload({ Message: 'ok' })).toBeNull();
    expect(sessionFromAuthPayload({ CustomerId: 0 })).toBeNull();
    expect(sessionFromAuthPayload(null)).toBeNull();
  });
});

describe('payments helpers', () => {
  it('only accepts https checkout URLs', () => {
    expect(findPaymentUrl({ PaymentUrl: 'https://pay.example.com/x' })).toBe('https://pay.example.com/x');
    expect(findPaymentUrl({ Order: { short_url: 'https://rzp.io/i/abc' } })).toBe('https://rzp.io/i/abc');
    expect(findPaymentUrl({ Order: { ShortUrl: 'https://rzp.io/i/abc' } })).toBe('https://rzp.io/i/abc');
    expect(findPaymentUrl({ PaymentUrl: 'http://insecure.example.com' })).toBeNull();
  });

  it('recognises paid statuses', () => {
    expect(isPaid('Paid')).toBe(true);
    expect(isPaid('captured')).toBe(true);
    expect(isPaid('Pending')).toBe(false);
  });
});
