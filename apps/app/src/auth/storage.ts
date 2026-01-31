// Auth Storage Utilities
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const WALLET_ADDRESS_KEY = 'wallet_address';
const EMAIL_KEY = 'email';
const PRIVATE_KEY_KEY = 'local_private_key';
const CDP_ACCESS_TOKEN_KEY = 'cdp_access_token';
const CDP_EMAIL_KEY = 'cdp_email';

const isWeb = Platform.OS === 'web';

const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export const authStorage = {
  async saveToken(token: string): Promise<void> {
    await storage.setItem(AUTH_TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await storage.getItem(AUTH_TOKEN_KEY);
  },

  async savePrivateKey(key: string): Promise<void> {
    await storage.setItem(PRIVATE_KEY_KEY, key);
  },

  async getPrivateKey(): Promise<string | null> {
    return await storage.getItem(PRIVATE_KEY_KEY);
  },

  async saveCDPAccessToken(token: string): Promise<void> {
    await storage.setItem(CDP_ACCESS_TOKEN_KEY, token);
  },

  async getCDPAccessToken(): Promise<string | null> {
    return await storage.getItem(CDP_ACCESS_TOKEN_KEY);
  },

  async saveCDPEmail(email: string): Promise<void> {
    await storage.setItem(CDP_EMAIL_KEY, email);
  },

  async getCDPEmail(): Promise<string | null> {
    return await storage.getItem(CDP_EMAIL_KEY);
  },


  async saveUser(user: { id: string; wallet_address: string; email: string }): Promise<void> {
    await storage.setItem(USER_ID_KEY, user.id);
    await storage.setItem(WALLET_ADDRESS_KEY, user.wallet_address);
    await storage.setItem(EMAIL_KEY, user.email);
  },

  async getUser(): Promise<{ id: string; wallet_address: string; email: string } | null> {
    const id = await storage.getItem(USER_ID_KEY);
    const wallet = await storage.getItem(WALLET_ADDRESS_KEY);
    const email = await storage.getItem(EMAIL_KEY);

    if (!id || !wallet || !email) {
      return null;
    }

    return { id, wallet_address: wallet, email };
  },

  async clear(): Promise<void> {
    await storage.deleteItem(AUTH_TOKEN_KEY);
    await storage.deleteItem(USER_ID_KEY);
    await storage.deleteItem(WALLET_ADDRESS_KEY);
    await storage.deleteItem(EMAIL_KEY);
    await storage.deleteItem(PRIVATE_KEY_KEY);
    await storage.deleteItem(CDP_ACCESS_TOKEN_KEY);
    await storage.deleteItem(CDP_EMAIL_KEY);
  },

};
