const { supabase, SUPABASE_URL } = require('./utils/supabase');
console.log(`Connected to: ${SUPABASE_URL}`);

// Mock data based on seed.sql
// Checkpoint: North Gate: 40.7968, -73.9580, radius 50
const VALID_GPS = { lat: 40.7968, lng: -73.9580 }; 
const INVALID_GPS = { lat: 40.0000, lng: -73.0000 }; 

async function runTests() {
  console.log("🚀 Starting Milestone 1 Tests...");

  // 1. Create campaign with checkpoints that include our test GPS
  const checkpoints = [{ lat: VALID_GPS.lat, lng: VALID_GPS.lng, radius: 10000, name: "Test" }];
  const { data: created, error: createErr } = await supabase.from('campaigns').insert({
    title: 'Milestone1 Test ' + Date.now(),
    description: 'Test',
    checkpoints,
    status: 'active',
    campaign_type: 'SINGLE_PHOTO',
    reward_amount: 1,
    stake_amount: 0,
    radius_m: 10000,
    ai_threshold: 80,
    active: true,
  }).select('id').single();
  let campaignId = created?.id;
  if (!campaignId) {
    const { data: first } = await supabase.from('campaigns').select('id').limit(1).single();
    if (!first?.id) {
      console.error("Failed to get/create campaign", createErr);
      return;
    }
    campaignId = first.id;
  }
  console.log(`Using Campaign ID: ${campaignId}`);

  // Test 1: Happy Path (Valid GPS + Photo)
  console.log("\n🧪 Test 1: Valid Submission (Should Approve)");
  const { data: sub1, error: err1 } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      gps_lat: VALID_GPS.lat,
      gps_lng: VALID_GPS.lng,
      photo_urls: ['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg'],
      user_id: '00000000-0000-0000-0000-000000000000',
      test_mock_agent: true
    })
    .select()
    .single();

  // If user FK fails, we need to create a user. Let's try to sign up a test user first.
  if (err1 && err1.message.includes('foreign key constraint')) {
     console.log("   Creating test user...");
     const { data: authData, error: authError } = await supabase.auth.admin.createUser({
       email: `test_${Date.now()}@example.com`,
       password: 'password123',
       email_confirm: true
     });
     if (authError) {
         console.error("   Failed to create test user:", authError);
         return;
     }
     const userId = authData.user.id;
     
     // Retry Insert
     const { data: sub1Retry, error: err1Retry } = await supabase
      .from('submissions')
      .insert({
        campaign_id: campaignId,
        gps_lat: VALID_GPS.lat,
        gps_lng: VALID_GPS.lng,
      photo_urls: ['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg'],
      user_id: userId,
      test_mock_agent: true
      })
      .select()
      .single();
      
     await verifySubmission(sub1Retry, 'APPROVED');
  } else if (err1) {
      console.error("   Insert failed:", err1);
  } else {
      await verifySubmission(sub1, 'APPROVED');
  }

  // Test 2: Invalid GPS
  console.log("\n🧪 Test 2: Invalid GPS (Should Reject)");
  // Reset user or reuse? Reuse is fine.
  // Need to fetch a user ID again if scope lost, but let's assume valid user exists now.
  // To be safe, let's just create a new user for clean state or use the previous one if we had it.
  // We'll wrap the logic in a helper to be cleaner next time, but for this script:
  
  // Create user for Test 2
  const { data: user2 } = await supabase.auth.admin.createUser({
       email: `test_fail_${Date.now()}@example.com`,
       password: 'password123',
       email_confirm: true
  });
  
  if (user2 && user2.user) {
      const { data: sub2, error: err2 } = await supabase
        .from('submissions')
        .insert({
          campaign_id: campaignId,
          gps_lat: INVALID_GPS.lat,
          gps_lng: INVALID_GPS.lng,
          photo_urls: ['http://example.com/photo1.jpg'],
          user_id: user2.user.id,
          test_mock_agent: true
        })
        .select()
        .single();
        
       if (err2) console.error("   Insert failed:", err2);
       else await verifySubmission(sub2, 'REJECTED'); // M1 logic: GPS Fail -> AUTO_REJECT
  }

}

async function verifySubmission(submission, expectedStatus) {
    if (!submission) {
        console.error("   ❌ No submission returned data");
        return;
    }
    console.log(`   Submission ID: ${submission.id}`);

    // Fallback: trigger may not fire (migration not applied). Invoke verify_submission directly.
    const invokeAgent = async () => {
        const { data: full } = await supabase.from('submissions').select('*').eq('id', submission.id).single();
        if (full) {
            const record = { ...full, test_mock_agent: true };
            await supabase.functions.invoke('verify_submission', { body: { record } });
        }
    };

    console.log("   Waiting for Agent...");
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const { data: updated } = await supabase
            .from('submissions')
            .select('status, verification_trace')
            .eq('id', submission.id)
            .single();
        if (updated && updated.status !== 'PENDING') {
            if (updated.status === expectedStatus) {
                console.log(`   ✅ Success! Status: ${updated.status}`);
            } else {
                console.error(`   ❌ Failed: Expected ${expectedStatus}, got ${updated.status}`);
            }
            return;
        }
        if (i === 2) await invokeAgent();
        process.stdout.write(".");
    }
    await invokeAgent();
    await new Promise(r => setTimeout(r, 2000));
    const { data: final } = await supabase.from('submissions').select('status').eq('id', submission.id).single();
    if (final?.status === expectedStatus) {
        console.log(`   ✅ Success! Status: ${final.status} (after direct invoke)`);
    } else {
        console.error(`   ❌ Timeout: Agent did not update status (stayed ${final?.status || 'PENDING'})`);
    }
}

runTests();
