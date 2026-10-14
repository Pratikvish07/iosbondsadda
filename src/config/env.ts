const DEFAULT_API_BASE_URL = 'https://bondsadda.com/MobileApiJson.ashx';

function readUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (!/^https:\/\//i.test(trimmed)) {
    // The API carries personal and financial data; never allow cleartext transport.
    throw new Error(`Expected an https:// URL, received "${trimmed}".`);
  }
  return trimmed;
}

export const API_BASE_URL = readUrl(process.env.EXPO_PUBLIC_API_BASE_URL, DEFAULT_API_BASE_URL);

/** Origin used to resolve relative asset paths returned by the API (e.g. "/VImage/logo.jpg"). */
export const API_ORIGIN = API_BASE_URL.replace(/^(https:\/\/[^/]+).*$/i, '$1');

export const PRIVACY_POLICY_URL = readUrl(
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  `${API_ORIGIN}/PrivacyPolicy`,
);

export const TERMS_URL = readUrl(process.env.EXPO_PUBLIC_TERMS_URL, `${API_ORIGIN}/TermsAndCondition`);

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'customercare@bondsadda.com';

export const CONTACT_URL = `${API_ORIGIN}/Contact`;

export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Upload limit for KYC / bank documents. The server (IIS) rejects request bodies over ~4 MB with
 * HTTP 413, and base64 inflates files by ~33%, so 2.5 MB is the largest file that reliably fits.
 */
export const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;
