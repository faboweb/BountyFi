const { ethers } = require('ethers');
const { supabase } = require('./utils/supabase');

async function runTests() {
  console.log("🚀 Starting Milestone 2 Tests (Human Validation)...");

  const { data: campaigns } = await supabase.from('campaigns').select('id').limit(1);
  const campaignId = campaigns[0].id;

  // Use wallet addresses (process_vote expects validator_address)
  const submitterWallet = ethers.Wallet.createRandom();
  const validatorWallets = [
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
  ];

  console.log("   Creating submission for human review...");
  const { data: sub } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      gps_lat: 40.7968,
      gps_lng: -73.9580,
      photo_urls: ['http://example.com/p1.jpg'],
      status: 'NEEDS_HUMAN_REVIEW',
      submitter_address: submitterWallet.address,
      test_mock_agent: true
    })
    .select()
    .single();

  if (!sub) {
    console.error("   ❌ Failed to create submission");
    return;
  }
  console.log(`   Submission ID: ${sub.id}`);

  // Test 1: Anti-collusion (Submitter cannot vote on own submission)
  console.log("\n🧪 Test 1: Anti-collusion");
  const { error: collErr } = await supabase.functions.invoke('process_vote', {
    body: {
      submission_id: sub.id,
      validator_address: submitterWallet.address,
      decision: 'APPROVE'
    }
  });
  if (collErr) {
    console.log("   ✅ Success: Collusion blocked.");
  } else {
    console.error("   ❌ Failed: Collusion should have been blocked (vote was accepted)");
  }

  // Test 2: Consensus (3 votes: Approve, Approve, Reject -> APPROVED)
  console.log("\n🧪 Test 2: Majority Consensus (2x Approve, 1x Reject)");
  const decisions = ['APPROVE', 'APPROVE', 'REJECT'];
  for (let i = 0; i < 3; i++) {
    process.stdout.write(`   Voting ${i+1}/3... `);
    const { data: voteData, error: voteErr } = await supabase.functions.invoke('process_vote', {
      body: {
        submission_id: sub.id,
        validator_address: validatorWallets[i].address,
        decision: decisions[i]
      }
    });
    console.log(voteData?.message || voteData?.error || voteErr?.message || 'ok');
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
