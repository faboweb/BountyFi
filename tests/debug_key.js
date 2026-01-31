const { supabase, SUPABASE_URL: URL, SERVICE_KEY: KEY } = require('./utils/supabase');

console.log(`Testing connection to ${URL}`);
console.log(`Key start: ${KEY ? KEY.substring(0,10) : 'MISSING'}...`);

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
