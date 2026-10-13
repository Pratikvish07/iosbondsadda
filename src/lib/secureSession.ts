import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { pickRecord, pickString } from './fields';

export interface Session {
  customerId: string;
  /** Bearer token, if the backend issues one at login. Sent as `Authorization` when present. */
  token: string | null;
  fullName: string | null;
  email: string | null;
  mobile: string | null;
}

const SESSION_KEY = 'bondsadda.session.v1';

const storeOptions: SecureStore.SecureStoreOptions = {
  // Keychain item never leaves this device (no iCloud/backup migration) and is unreadable while locked.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// SecureStore has no web implementation. On web the session lives in memory only, so a reload
// signs the user out; that is deliberate rather than falling back to plaintext localStorage.
let webSession: string | null = null;
const isWeb = Platform.OS === 'web';

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = isWeb ? webSession : await SecureStore.getItemAsync(SESSION_KEY, storeOptions);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.customerId) return null;
    return {
      customerId: String(parsed.customerId),
      token: parsed.token ?? null,
      fullName: parsed.fullName ?? null,
      email: parsed.email ?? null,
      mobile: parsed.mobile ?? null,
    };
  } catch {
    // Corrupt or unreadable entry (e.g. keychain reset): treat as signed out.
    await clearSession();
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (isWeb) {
    webSession = raw;
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, raw, storeOptions);
}

export async function clearSession(): Promise<void> {
  if (isWeb) {
    webSession = null;
    return;
  }
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY, storeOptions);
  } catch {
    // Nothing stored; nothing to clear.
  }
}

/**
 * Builds a session from the login/signup `Data` payload. The documented contract only guarantees a
 * customer identifier, so common key spellings are accepted, including a nested `Customer` object.
 */
export function sessionFromAuthPayload(data: unknown, fallbackUserName?: string): Session | null {
  const sources = [data, pickRecord(data, 'Customer', 'User', 'Profile')].filter(Boolean);
  const read = (...keys: string[]) => {
    for (const source of sources) {
      const value = pickString(source, ...keys);
      if (value) return value;
    }
    return undefined;
  };

  const customerId = read('CustomerId', 'CustomerID', 'CustId', 'UserId', 'Id');
  if (!customerId || customerId === '0') return null;

  const fallbackEmail = fallbackUserName?.includes('@') ? fallbackUserName : undefined;
  const fallbackMobile = fallbackUserName && /^\d{10}$/.test(fallbackUserName) ? fallbackUserName : undefined;

  return {
    customerId,
    token: read('Token', 'AuthToken', 'AccessToken', 'SessionToken') ?? null,
    fullName: read('FullName', 'CustomerName', 'Name', 'UserName') ?? null,
    email: read('Email', 'EmailId', 'EmailID') ?? fallbackEmail ?? null,
    mobile: read('Mobile', 'MobileNo', 'MobileNumber', 'Phone') ?? fallbackMobile ?? null,
  };
}
