import type { SerializedError } from '@reduxjs/toolkit';
import type { BaseQueryFn, FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/config/env';

import type { ApiEnvelope } from './types';

type Primitive = string | number | boolean | null | undefined;

export interface ApiRequest {
  action: string;
  method?: 'GET' | 'POST';
  params?: Record<string, Primitive>;
  body?: object;
}

export interface ApiMeta {
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  /** Server's `Message` from the envelope, e.g. "KYC submitted successfully." */
  message: string | null;
}

/** Minimal view of the store this module needs; avoids a circular import with `@/store`. */
interface AuthAwareState {
  auth: { session: { token: string | null } | null };
}

type Outcome = { data: unknown; error?: undefined } | { error: FetchBaseQueryError; data?: undefined };

export function buildUrl({ action, params }: ApiRequest): string {
  const search = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  return `${API_BASE_URL}?${search.toString()}`;
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return !!value && typeof value === 'object' && 'Success' in value;
}

/**
 * One HTTP round trip. Deliberately not built on `fetchBaseQuery`: that helper clones every
 * response, and the `expo/fetch` implementation installed globally on native does not need the
 * extra body copy. This reads the body exactly once.
 */
async function send(request: ApiRequest, token: string | null, outerSignal: AbortSignal): Promise<{ outcome: Outcome; status: number }> {
  const method = request.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method === 'POST') headers['Content-Type'] = 'application/json';

  // Combine RTK's abort signal (component unmount / refetch) with our timeout.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  if (outerSignal.aborted) controller.abort();
  else outerSignal.addEventListener('abort', onOuterAbort);

  try {
    const response = await fetch(buildUrl(request), {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(request.body ?? {}) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();

    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return {
        status: response.status,
        outcome: {
          error: {
            status: 'PARSING_ERROR',
            originalStatus: response.status,
            data: text.slice(0, 500),
            error: 'Unexpected response from server',
          },
        },
      };
    }
    if (!response.ok) {
      return { status: response.status, outcome: { error: { status: response.status, data: parsed } } };
    }
    return { status: response.status, outcome: { data: parsed } };
  } catch (e) {
    const error: FetchBaseQueryError = timedOut
      ? { status: 'TIMEOUT_ERROR', error: 'Request timed out' }
      : { status: 'FETCH_ERROR', error: String(e) };
    return { status: 0, outcome: { error } };
  } finally {
    clearTimeout(timer);
    outerSignal.removeEventListener('abort', onOuterAbort);
  }
}

const RETRYABLE = new Set<unknown>(['FETCH_ERROR', 'TIMEOUT_ERROR']);
const MAX_GET_RETRIES = 2;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls one MobileApiJson.ashx action and unwraps `{ Success, Message, Data }`.
 * - `Success: false` (always sent with HTTP 200) becomes a CUSTOM_ERROR carrying the server message.
 * - Network failures on GETs are retried with backoff. POSTs are never retried, because actions
 *   such as createDeal and createPaymentOrder are not idempotent.
 */
export const apiBaseQuery: BaseQueryFn<ApiRequest, unknown, FetchBaseQueryError, object, ApiMeta> = async (
  request,
  api,
) => {
  const token = (api.getState() as AuthAwareState).auth.session?.token ?? null;
  const isGet = (request.method ?? 'GET') === 'GET';

  let attempt = 0;
  let { outcome, status } = await send(request, token, api.signal);
  while (isGet && outcome.error && RETRYABLE.has(outcome.error.status) && attempt < MAX_GET_RETRIES && !api.signal.aborted) {
    attempt++;
    await wait(400 * 2 ** attempt);
    ({ outcome, status } = await send(request, token, api.signal));
  }

  const meta: ApiMeta = { status, message: null };
  if (outcome.error) return { error: outcome.error, meta };

  const payload = outcome.data;
  if (!isEnvelope(payload)) {
    return {
      error: { status: 'PARSING_ERROR', originalStatus: status, data: '', error: 'Unexpected response from server' },
      meta,
    };
  }

  meta.message = typeof payload.Message === 'string' ? payload.Message.trim() : null;
  if (!payload.Success) {
    return {
      error: { status: 'CUSTOM_ERROR', error: meta.message || 'Request could not be completed', data: payload },
      meta,
    };
  }
  return { data: payload.Data, meta };
};

/** Converts any RTK Query / thunk error into a sentence that is safe to show to the user. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'status' in error) {
    const e = error as FetchBaseQueryError;
    switch (e.status) {
      case 'CUSTOM_ERROR':
        return e.error || fallback;
      case 'FETCH_ERROR':
        return 'Unable to reach BondsAdda. Check your internet connection and try again.';
      case 'TIMEOUT_ERROR':
        return 'The server took too long to respond. Please try again.';
      case 'PARSING_ERROR':
        return 'We received an unexpected response from the server. Please try again later.';
      default:
        if (typeof e.status === 'number') {
          if (e.status >= 500) return 'BondsAdda is temporarily unavailable. Please try again shortly.';
          if (e.status === 404) return 'The requested information could not be found.';
        }
        return fallback;
    }
  }
  const message = (error as SerializedError).message;
  return message || fallback;
}
