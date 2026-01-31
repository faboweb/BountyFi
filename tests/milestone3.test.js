const { supabase, SUPABASE_URL: URL } = require('./utils/supabase');

console.log(`Connected to: ${URL}`);

async function runTests() {
  console.log("🚀 Starting Milestone 3 Tests (AI Vision Integration)...");

  // 1. Setup: Fetch campaign
  const { data: campaigns } = await supabase.from('campaigns').select('id').limit(1);
  const campaignId = campaigns[0].id;

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
      gps_lat: 40.7968, 
      gps_lng: -73.9580,
      photo_urls: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=200'], 
      status: 'PENDING'
    })
    .select()
    .single();

  console.log(`   Submission ID: ${sub.id}`);
  
  // 3. Poll for AI Decision
  console.log("   Waiting for AI vision agent to process...");
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    
    const { data: updated } = await supabase
      .from('submissions')
      .select('status, verification_trace')
      .eq('id', sub.id)
      .single();
      
    // Milestone 3 logic: verify_submission approvals trigger run_livepeer_inference.
    // run_livepeer_inference updates status based on AI results.
    // If it's already APPROVED or NEEDS_HUMAN_REVIEW, check trace for ai_vision.
    if (updated.verification_trace?.ai_vision || updated.status !== 'APPROVED') {
        if (updated.verification_trace?.ai_vision) {
            console.log("   ✅ Success: AI Vision analysis found in trace.");
            console.log(`   Model: ${updated.verification_trace.ai_vision.model}`);
            console.log(`   AI Text: "${updated.verification_trace.ai_vision.text}"`);
            console.log(`   AI Decision: ${updated.verification_trace.ai_vision.decision}`);
            console.log(`   Final Status: ${updated.status}`);
            return;
        }
    }
    process.stdout.write(".");
  }
  
  console.error("\n   ❌ Timeout: AI vision result not found in trace.");
}

runTests();
