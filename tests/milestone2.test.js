require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const URL = 'https://cguqjaoeleifeaxktmwv.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

const supabase = createClient(URL, KEY);

async function runTests() {
  console.log("🚀 Starting Milestone 2 Tests (Human Validation)...");

  // 1. Setup: Fetch a submission and 3 test users
  const { data: campaigns } = await supabase.from('campaigns').select('id').limit(1);
  const campaignId = campaigns[0].id;

  console.log("   Creating test users...");
  const users = [];
  for (let i = 0; i < 4; i++) {
    const { data } = await supabase.auth.admin.createUser({
      email: `val_test_${i}_${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true
    });
    users.push(data.user);
  }

  const submitter = users[0];
  const validators = users.slice(1);

  console.log("   Creating submission for human review...");
  // Logic: Missing GPS or photo count < 3 (if we strictly enforced it) leads to human review
  // But our current agent rejects if GPS fails. Let's make one that is borderline?
  // Actually, let's just create a PENDING submission manually as if it came from the app
  // and bypass the trigger for a moment, or just use one.
  
  const { data: sub } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      user_id: submitter.id,
      gps_lat: 40.7968, 
      gps_lng: -73.9580,
      photo_urls: ['http://example.com/p1.jpg'],
      status: 'NEEDS_HUMAN_REVIEW' // Force status for test
    })
    .select()
    .single();

  console.log(`   Submission ID: ${sub.id}`);

  // Test 1: Anti-collusion (Submitter cannot vote)
  console.log("\n🧪 Test 1: Anti-collusion");
  try {
      const resp = await fetch(`${URL}/functions/v1/process_vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            submission_id: sub.id,
            validator_id: submitter.id,
            decision: 'APPROVE'
        })
      });
      const data = await resp.json();
      if (data.error && data.error.includes("Collusion")) {
          console.log("   ✅ Success: Collusion blocked.");
      } else {
          console.error("   ❌ Failed: Collusion should have been blocked", data);
      }
  } catch (e) {
      console.error("   ❌ Request failed:", e);
  }

  // Test 2: Consensus (3 votes: Approve, Approve, Reject -> APPROVED)
  console.log("\n🧪 Test 2: Majority Consensus (2x Approve, 1x Reject)");
  const decisions = ['APPROVE', 'APPROVE', 'REJECT'];
  
  for (let i = 0; i < 3; i++) {
      process.stdout.write(`   Voting ${i+1}/3... `);
      const resp = await fetch(`${URL}/functions/v1/process_vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            submission_id: sub.id,
            validator_id: validators[i].id,
            decision: decisions[i]
        })
      });
      const data = await resp.json();
      console.log(data.message || data.error);
  }

  // Verify Final Status
  console.log("   Verifying final submission status...");
  const { data: finalSub } = await supabase
    .from('submissions')
    .select('status')
    .eq('id', sub.id)
    .single();
    
  if (finalSub.status === 'APPROVED') {
      console.log("   ✅ Success: Milestone 2 Consensus reached APPROVED status.");
  } else {
      console.error(`   ❌ Failed: Expected APPROVED, got ${finalSub.status}`);
  }

}

runTests();
