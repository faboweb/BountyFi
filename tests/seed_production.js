require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://cguqjaoeleifeaxktmwv.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(URL, KEY.trim());

async function seed() {
  console.log("🌱 Seeding production campaign...");
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      title: 'Production Test Campaign',
      rules: 'Verify GPS and Photo Count in Prod.',
      prize_pool: 1000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      checkpoints: [
        { name: "North Gate", lat: 40.7968, lng: -73.9580, radius: 50 },
        { name: "Bethesda Fountain", lat: 40.7738, lng: -73.9708, radius: 50 }
      ]
    })
    .select();

  if (error) {
    console.error("❌ Seed failed:", error.message);
  } else {
    console.log("✅ Seed success! Campaign ID:", data[0].id);
  }
}

seed();
