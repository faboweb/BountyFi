const { supabase, SUPABASE_URL: URL } = require('./utils/supabase');

console.log(`Connected to: ${URL}`);

async function runTests() {
  console.log("🚀 Starting Milestone 3 Tests (AI Vision Integration)...");

  // 1. Create campaign with matching checkpoints
  const testGps = { lat: 40.7968, lng: -73.9580 };
  const { data: created } = await supabase.from('campaigns').insert({
    title: 'Milestone3 Test ' + Date.now(),
    description: 'Test',
    checkpoints: [{ lat: testGps.lat, lng: testGps.lng, radius: 10000, name: 'Test' }],
    status: 'active',
    campaign_type: 'SINGLE_PHOTO',
    reward_amount: 1,
    stake_amount: 0,
    radius_m: 10000,
    ai_threshold: 80,
    active: true,
  }).select('id').single();
  const campaignId = created?.id || (await supabase.from('campaigns').select('id').limit(1).single()).data?.id;
  if (!campaignId) throw new Error('No campaign');

  console.log("   Creating test user...");
  const { data: authData } = await supabase.auth.admin.createUser({
    email: `ai_test_${Date.now()}@example.com`,
    password: 'password123',
    email_confirm: true
  });
  const userId = authData.user.id;

  // 2. Insert Submission (Should trigger GPS Pass -> AI Vision)
  console.log("   Submitting photo for AI analysis...");
  const { data: sub } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      gps_lat: testGps.lat,
      gps_lng: testGps.lng,
      photo_urls: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=200'],
      status: 'PENDING',
      test_mock_agent: true
    })
    .select()
    .single();

  console.log(`   Submission ID: ${sub.id}`);
  
  const invokeAgent = async () => {
    const { data: full } = await supabase.from('submissions').select('*').eq('id', sub.id).single();
    if (full) {
      const record = {
        ...full,
        test_mock_agent: true,
        photo_urls: full.photo_urls || (full.photo_url ? [full.photo_url] : []),
      };
      const { data: invData, error } = await supabase.functions.invoke('verify_submission', {
        body: { record, test_mock_agent: true },
      });
      if (error) console.warn("   (invoke error:", error.message?.slice(0, 60) + ")");
      return invData;
    }
  };

  const traceHasAiVision = (t) =>
    t?.ai_vision || (Array.isArray(t?.steps) && t.steps.some((s) => s.check === 'ai_vision'));
  const passedMockAgent = (data) =>
    data?.decision === 'AUTO_APPROVE' || data?.steps?.some((s) => s.details?.includes('Mock agent'));

  let invData = await invokeAgent();
  if (traceHasAiVision(invData) || passedMockAgent(invData)) {
    console.log("   ✅ Success: AI Vision / mock agent found.");
    return;
  }
  console.log("   Waiting for AI vision agent to process...");
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (i === 2) invData = await invokeAgent();
    const { data: updated } = await supabase
      .from('submissions')
      .select('status, verification_trace')
      .eq('id', sub.id)
      .single();
    if (traceHasAiVision(updated?.verification_trace) || (updated?.status === 'APPROVED' && updated?.ai_confidence >= 90)) {
      console.log("   ✅ Success: AI Vision / approval found.");
      return;
    }
    process.stdout.write(".");
  }
  invData = await invokeAgent();
  await new Promise(r => setTimeout(r, 1500));
  const { data: final } = await supabase.from('submissions').select('verification_trace, status, ai_confidence').eq('id', sub.id).single();
  if (traceHasAiVision(final?.verification_trace) || traceHasAiVision(invData) || (final?.status === 'APPROVED' && final?.ai_confidence >= 90)) {
    console.log("   ✅ Success: Verification complete.");
  } else {
    console.error("\n   ❌ AI vision not found. Deploy: supabase functions deploy verify_submission");
  }
}

runTests();
