// API Configuration
export const API_CONFIG = {
  // Supabase API (for later connection)
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cguqjaoeleifeaxktmwv.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE', // Replace with your actual anon key from Supabase dashboard

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
