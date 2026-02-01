// API Configuration
const SUPABASE_ANON_KEY_PLACEHOLDER = 'YOUR_SUPABASE_ANON_KEY_HERE';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_PLACEHOLDER;

export const API_CONFIG = {
  // Supabase API (for later connection)
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cguqjaoeleifeaxktmwv.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: supabaseAnonKey,

  // True when a real anon key is set (not the placeholder). When false, Realtime/WebSocket is skipped to avoid connection errors.
  isSupabaseConfigured: supabaseAnonKey !== SUPABASE_ANON_KEY_PLACEHOLDER && supabaseAnonKey.length > 0,

  // Mock mode toggle (default: false - do not show mock data unless explicitly enabled)
  // Set EXPO_PUBLIC_USE_MOCK_API=true in .env to enable mock data
  USE_MOCK_API: process.env.EXPO_PUBLIC_USE_MOCK_API === 'true',

  // API Base URL (when not using mocks)
  API_BASE_URL: (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cguqjaoeleifeaxktmwv.supabase.co') + '/rest/v1',

  // WebSocket URL (for realtime updates)
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || (process.env.EXPO_PUBLIC_SUPABASE_URL ? process.env.EXPO_PUBLIC_SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1' : 'wss://cguqjaoeleifeaxktmwv.supabase.co/realtime/v1'),

  // Mock delay simulation (ms)
  MOCK_DELAY: 300,
};
