require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Production URL
const URL = 'https://cguqjaoeleifeaxktmwv.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KEY) {
    console.error("No key in .env");
    process.exit(1);
}

console.log(`Testing connection to ${URL}`);
console.log(`Key start: ${KEY.substring(0,10)}...`);

const supabase = createClient(URL, KEY.trim());

async function test() {
  const { data, error } = await supabase.from('campaigns').select('count(*)');
  if (error) {
    console.error("❌ Connection Failed:", error.message);
    if (error.code) console.error("   Code:", error.code);
  } else {
    console.log("✅ Success! Data:", data);
  }
}

test();
