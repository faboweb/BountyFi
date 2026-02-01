/**
 * Verifies that creating a campaign via the app flow actually saves it to Supabase.
 * - Calls manage_campaign Edge Function with action CREATE_CAMPAIGN
 * - Reads the campaign back from public.campaigns
 */
const { supabase, SUPABASE_URL } = require('./utils/supabase');

if (!SUPABASE_URL) {
  console.error('❌ Missing TEST_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}

async function run() {
  console.log('🔍 Checking that a campaign gets saved to Supabase...\n');

  const payload = {
    action: 'CREATE_CAMPAIGN',
    user_id: null,
    title: 'Test Save Campaign ' + Date.now(),
    description: 'Created by campaign_save_supabase.test.js',
    prize_total: 100,
    min_funding_thb: 50,
    requires_face_recognition: false,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    checkpoints: [{ name: 'Test Location', lat: 13.7563, lng: 100.5018, radius: 50 }],
    status: 'active',
  };

  // 1. Create via Edge Function (same path as the app)
  const { data, error } = await supabase.functions.invoke('manage_campaign', {
    body: payload,
  });

  if (error) {
    console.error('❌ manage_campaign (CREATE_CAMPAIGN) failed:', error.message || error);
    if (error.context) console.error('   Context:', error.context);
    process.exit(1);
  }

  if (data?.error) {
    console.error('❌ Edge function returned error:', data.error);
    process.exit(1);
  }

  if (!data?.id) {
    console.error('❌ No campaign id in response:', data);
    process.exit(1);
  }

  const campaignId = data.id;
  console.log('   Created campaign id:', campaignId);

  // 2. Read back from Supabase
  const { data: row, error: readError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (readError) {
    console.error('❌ Campaign not found in DB after create:', readError.message);
    process.exit(1);
  }

  if (!row || row.title !== payload.title) {
    console.error('❌ Campaign in DB does not match:', row);
    process.exit(1);
  }

  console.log('   Campaign found in DB:', row.title);
  console.log('   prize_total:', row.prize_total, 'status:', row.status);
  console.log('\n✅ Campaign is saved to Supabase correctly.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
