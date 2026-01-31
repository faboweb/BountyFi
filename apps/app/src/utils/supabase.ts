import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config/api';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

export const supabase = createClient(
    API_CONFIG.SUPABASE_URL,
    API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            storage: ExpoSecureStoreAdapter as any,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);
