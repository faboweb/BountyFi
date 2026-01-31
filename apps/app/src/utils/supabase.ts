import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const PlatformStorageAdapter = {
    getItem: (key: string) => {
        if (isWeb) {
            return Promise.resolve(localStorage.getItem(key));
        }
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        if (isWeb) {
            localStorage.setItem(key, value);
            return Promise.resolve();
        }
        return SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        if (isWeb) {
            localStorage.removeItem(key);
            return Promise.resolve();
        }
        return SecureStore.deleteItemAsync(key);
    },
};

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG } from '../config/api';

// ... (rest of the imports if needed, but they are already at top)

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
