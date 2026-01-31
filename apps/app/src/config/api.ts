// API Configuration
export const API_CONFIG = {
  // Supabase API (for later connection)
  SUPABASE_URL: 'https://cguqjaoeleifeaxktmwv.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_MBkuc0i6qrOEZiechqODwg_X6pc2DSb',

  // Mock mode toggle (default: false - do not show mock data unless explicitly enabled)
  // Set EXPO_PUBLIC_USE_MOCK_API=true in .env to enable mock data
  USE_MOCK_API: process.env.EXPO_PUBLIC_USE_MOCK_API === 'true',

  // API Base URL (when not using mocks)
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://cguqjaoeleifeaxktmwv.supabase.co',

  // WebSocket URL (for realtime updates)
  WS_URL: process.env.EXPO_PUBLIC_WS_URL || 'wss://cguqjaoeleifeaxktmwv.supabase.co/realtime/v1',

  // Mock delay simulation (ms)
  MOCK_DELAY: 300,
};
