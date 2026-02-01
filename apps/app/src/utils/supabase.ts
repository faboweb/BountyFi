import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config/api';

const isWeb = Platform.OS === 'web';

// Same key format SupabaseClient uses: sb-<projectRef>-auth-token
const SUPABASE_AUTH_STORAGE_KEY = (() => {
  try {
    const hostname = new URL(API_CONFIG.SUPABASE_URL).hostname;
    return `sb-${hostname.split('.')[0]}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
})();

const rawGetItem = (key: string): Promise<string | null> => {
  if (isWeb) {
    return Promise.resolve(localStorage.getItem(key));
  }
  return SecureStore.getItemAsync(key);
};

const rawRemoveItem = (key: string): Promise<void> => {
  if (isWeb) {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(key);
};

/**
 * Supabase GoTrueClient can throw "Date value out of bounds" when session JSON
 * has an invalid expires_at (e.g. corrupted or from a different auth flow).
 * We never return session data with invalid expires_at so parsing never crashes.
 */
const safeGetItem = async (key: string): Promise<string | null> => {
  const value = await rawGetItem(key);
  if (key !== SUPABASE_AUTH_STORAGE_KEY || !value) {
    return value;
  }
  try {
    const obj = JSON.parse(value) as { expires_at?: unknown };
    const exp = obj?.expires_at;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) {
      await rawRemoveItem(key);
      return null;
    }
  } catch {
    await rawRemoveItem(key);
    return null;
  }
  return value;
};

const PlatformStorageAdapter = {
  getItem: safeGetItem,
  setItem: (key: string, value: string) => {
    if (isWeb) {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: rawRemoveItem,
};

export const supabase = createClient(
  API_CONFIG.SUPABASE_URL,
  API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: PlatformStorageAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

/** Clear Supabase auth session storage to recover from "Date value out of bounds" or corrupted session. */
export async function clearSupabaseAuthStorage(): Promise<void> {
  await rawRemoveItem(SUPABASE_AUTH_STORAGE_KEY);
  await rawRemoveItem(`${SUPABASE_AUTH_STORAGE_KEY}-user`);
}
