const { supabase, SUPABASE_URL } = require('./utils/supabase');
console.log(`Connected to: ${SUPABASE_URL}`);

// Mock data based on seed.sql
// Checkpoint: North Gate: 40.7968, -73.9580, radius 50
const VALID_GPS = { lat: 40.7968, lng: -73.9580 }; 
const INVALID_GPS = { lat: 40.0000, lng: -73.0000 }; 

async function runTests() {
  console.log("🚀 Starting Milestone 1 Tests...");

  // 1. Get Campaign
  const { data: campaigns, error: campError } = await supabase
    .from('campaigns')
    .select('id')
    .limit(1);

  if (campError || !campaigns.length) {
    console.error("Failed to fetch campaign:", campError);
    return;
  }
  const campaignId = campaigns[0].id;
  console.log(`Using Campaign ID: ${campaignId}`);

  // Test 1: Happy Path (Valid GPS + Photo)
  console.log("\n🧪 Test 1: Valid Submission (Should Approve)");
  const { data: sub1, error: err1 } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      gps_lat: VALID_GPS.lat,
      gps_lng: VALID_GPS.lng,
      photo_urls: ['http://example.com/photo1.jpg'],
      user_id: '00000000-0000-0000-0000-000000000000' // Mock user, might fail fk if not exists. 
      // Actually, we need a valid user. Let's create one or verify if we can insert with random UUID if we disabled FK or use service role?
      // RLS allows insert? We are using service role, so RLS bypassed.
      // But FK constraints exist. 'user_id' references auth.users.
      // We need to create a dummy user first or use an existing one.
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
        photo_urls: ['http://example.com/photo1.jpg'],
        user_id: userId
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
          user_id: user2.user.id
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
    
    // Wait a moment for Trigger -> Edge Function to fire?
    // Trigger is synchronous (AFTER INSERT EXECUTE FUNCTION... usually runs in transaction or fires async request?)
    // Our trigger does `net.http_post`. This is from `pg_net` or similar? 
    // Wait, standard Supabase triggers for Functions usually use webhooks or `pg_net`.
    // Our migration used: `net.http_post`. This is async.
    // So we need to poll for status update.
    
    console.log("   Waiting for Agent...");
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000)); // 1s wait
        
        const { data: updated } = await supabase
            .from('submissions')
            .select('status, verification_trace')
            .eq('id', submission.id)
            .single();
            
        if (updated.status !== 'PENDING') {
            if (updated.status === expectedStatus) {
                console.log(`   ✅ Success! Status: ${updated.status}`);
                console.log(`   Trace: ${JSON.stringify(updated.verification_trace?.decision)}`);
            } else {
                console.error(`   ❌ Failed: Expected ${expectedStatus}, got ${updated.status}`);
                console.log(`   Trace: ${JSON.stringify(updated.verification_trace)}`);
            }
            return;
        }
        process.stdout.write(".");
    }
    console.error("\n   ❌ Timeout: Agent did not update status (stayed PENDING)");
}

runTests();
