// Load .env first, then override with .env.test if it exists
require('dotenv').config();
require('dotenv').config({ path: '.env.test', override: true });

const { createClient } = require('@supabase/supabase-js');

const isTest = process.env.NODE_ENV === 'test';

// Priority:
// 1. TEST_SUPABASE_URL (explicit override)
// 2. Local Supabase (if in test mode and no TEST_SUPABASE_URL)
// 3. SUPABASE_URL from .env (fallback for prod/manual runs)
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || (isTest ? 'http://127.0.0.1:54321' : process.env.SUPABASE_URL);

// Similar priority for service key
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || (isTest ? process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!SERVICE_KEY && isTest) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is missing in test mode. Tests might fail.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY || '');

module.exports = {
  supabase,
  SUPABASE_URL,
  SERVICE_KEY
};
