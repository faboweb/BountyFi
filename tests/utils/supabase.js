// Load .env first, then override with .env.test if it exists
require('dotenv').config();
require('dotenv').config({ path: '.env.test', override: true });

const { createClient } = require('@supabase/supabase-js');

const isTest = process.env.NODE_ENV === 'test';

// Priority: TEST_* override, then LOCAL_* (test mode), then standard env
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL || (isTest ? 'http://127.0.0.1:54321' : '');
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY && isTest) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY is missing in test mode. Tests might fail.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY || '');

module.exports = {
  supabase,
  SUPABASE_URL,
  SERVICE_KEY
};
