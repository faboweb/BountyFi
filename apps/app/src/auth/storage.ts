// Auth Storage Utilities
import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';
const WALLET_ADDRESS_KEY = 'wallet_address';
const EMAIL_KEY = 'email';
const PRIVATE_KEY_KEY = 'local_private_key';


export const authStorage = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async savePrivateKey(key: string): Promise<void> {
    await SecureStore.setItemAsync(PRIVATE_KEY_KEY, key);
  },

  async getPrivateKey(): Promise<string | null> {
    return await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  },



  async saveUser(user: { id: string; wallet_address: string; email: string }): Promise<void> {
    await SecureStore.setItemAsync(USER_ID_KEY, user.id);
    await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, user.wallet_address);
    await SecureStore.setItemAsync(EMAIL_KEY, user.email);
  },

  async getUser(): Promise<{ id: string; wallet_address: string; email: string } | null> {
    const id = await SecureStore.getItemAsync(USER_ID_KEY);
    const wallet = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
    const email = await SecureStore.getItemAsync(EMAIL_KEY);

    if (!id || !wallet || !email) {
      return null;
    }

    return { id, wallet_address: wallet, email };
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
    await SecureStore.deleteItemAsync(EMAIL_KEY);
    await SecureStore.deleteItemAsync(PRIVATE_KEY_KEY);
  },

};
