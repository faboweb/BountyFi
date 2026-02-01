/**
 * Verification Flow Tests
 *
 * Setup: 5 wallets. Wallets 1 and 2 are friends (trust network).
 * One “AI” path is simulated via ai_confidence on submissions.
 *
 * Case 1: 3 submissions, 1 golden task. All truthy, golden task good. Show prize distribution.
 * Case 2: 3 submissions, 1 golden. Majority correct but non-friend lies on golden task. AI high confidence. Show prize distribution.
 * Case 3: AI low confidence → submission rejected (simulated by status=REJECTED, ai_confidence=25).
 * Case 4: 1 friend lies on submission. AI high confidence. Majority still approves.
 *
 * Run: node tests/verification_flow.test.js
 * Uses process_vote Edge Function when available; otherwise falls back to direct DB (votes + consensus).
 * Prize distribution (weight = amount/(value+1)) is printed when campaign_prizes has rows for the campaign.
 */

const { supabase, SUPABASE_URL } = require('./utils/supabase');
const { ethers } = require('ethers');

console.log(`Connected to: ${SUPABASE_URL}`);

// --- Helpers ---

async function getOrCreateCampaign() {
  const { data: existing } = await supabase.from('campaigns').select('id').limit(1).single();
  if (existing) return existing.id;
  const { data: created, error } = await supabase
    .from('campaigns')
    .insert({
      title: 'Verification Flow Test Campaign',
      campaign_type: 'SINGLE_PHOTO',
      description: 'Test',
      reward_amount: 1,
      stake_amount: 0,
      radius_m: 500,
      ai_threshold: 70,
      active: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(`Campaign create failed: ${error.message}`);
  return created.id;
}

/**
 * Prize distribution: weight_i = amount / (value + 1). Show as table.
 */
async function showPrizeDistribution(campaignId) {
  const { data: prizes, error } = await supabase
    .from('campaign_prizes')
    .select('id, label, emoji, amount, value')
    .eq('campaign_id', campaignId);
  if (error) {
    console.log('   (campaign_prizes query failed:', error.message, '- skipping distribution)');
    return;
  }
  if (!prizes?.length) {
    console.log('   (No campaign_prizes for this campaign; add prizes to see distribution)');
    return;
  }
  let totalWeight = 0;
  const rows = prizes.map((p) => {
    const amount = Number(p.amount) || 1;
    const value = Number(p.value) || 1;
    const weight = amount / (value + 1);
    totalWeight += weight;
    return { label: p.label || p.emoji || p.id, amount, value, weight };
  });
  console.log('   --- Prize distribution (weight = amount/(value+1)) ---');
  rows.forEach((r) => {
    const pct = totalWeight > 0 ? ((100 * r.weight) / totalWeight).toFixed(1) : '0';
    console.log(`   ${r.label}: amount=${r.amount} value=${r.value} weight=${r.weight.toFixed(2)} (${pct}%)`);
  });
  console.log(`   Total weight: ${totalWeight.toFixed(2)}`);
}

/**
 * Create a submission in DB (no chain). Status NEEDS_HUMAN_REVIEW for jury cases.
 */
async function createSubmission(campaignId, submitterAddress, options = {}) {
  const hash = ethers.hexlify(ethers.randomBytes(32));
  const lat = options.gps_lat ?? 40.7;
  const lng = options.gps_lng ?? -74;
  const { data: sub, error } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      submitter_address: submitterAddress,
      photo_url: options.photo_url || 'https://example.com/photo.jpg',
      photo_hash: hash,
      gps_lat: lat,
      gps_lng: lng,
      lat,
      lng,
      status: options.status ?? 'NEEDS_HUMAN_REVIEW',
      ai_confidence: options.ai_confidence ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Submission create failed: ${error.message}`);
  return sub;
}

/**
 * Insert golden task metadata (service role).
 */
async function setGoldenTask(submissionId, expectedOutcome) {
  const { error } = await supabase.from('golden_tasks').insert({
    submission_id: submissionId,
    expected_outcome: expectedOutcome,
    golden_content: { note: 'verification_flow.test' },
  });
  if (error) throw new Error(`Golden task insert failed: ${error.message}`);
}

let useEdgeFunction = true;

/**
 * Call process_vote Edge Function, or fallback to direct DB (votes + consensus).
 */
async function vote(submissionId, validatorAddress, decision) {
  if (useEdgeFunction) {
    const { data, error } = await supabase.functions.invoke('process_vote', {
      body: {
        submission_id: submissionId,
        validator_address: validatorAddress,
        decision,
        reason: 'test',
      },
    });
    if (error) {
      console.log('   (process_vote Edge Function unavailable, using DB fallback)');
      useEdgeFunction = false;
    } else if (data?.error) {
      throw new Error(`process_vote error: ${data.error}`);
    } else {
      return data;
    }
  }

  // Fallback: insert vote and apply consensus in DB
  const { data: sub } = await supabase
    .from('submissions')
    .select('submitter_address')
    .eq('id', submissionId)
    .single();
  if (!sub) throw new Error(`Submission not found: ${submissionId}`);
  if (sub.submitter_address === validatorAddress) {
    throw new Error('Collusion: cannot vote on own submission');
  }
  const { error: insertErr } = await supabase.from('votes').insert({
    submission_id: submissionId,
    validator_address: validatorAddress,
    decision,
    reason: 'test',
  });
  if (insertErr) throw new Error(`Vote insert failed: ${insertErr.message}`);

  const { data: votes } = await supabase
    .from('votes')
    .select('decision')
    .eq('submission_id', submissionId);
  if (votes && votes.length >= 3) {
    const counts = votes.reduce((acc, v) => {
      acc[v.decision] = (acc[v.decision] || 0) + 1;
      return acc;
    }, {});
    let finalStatus = 'NEEDS_HUMAN_REVIEW';
    if ((counts['APPROVE'] || 0) >= 2) finalStatus = 'APPROVED';
    if ((counts['REJECT'] || 0) >= 2) finalStatus = 'REJECTED';
    await supabase.from('submissions').update({ status: finalStatus }).eq('id', submissionId);
  }
  return { message: 'Vote recorded (fallback)' };
}

/**
 * Fetch submission status.
 */
async function getSubmission(id) {
  const { data, error } = await supabase.from('submissions').select('*').eq('id', id).single();
  if (error) throw new Error(`Submission fetch failed: ${error.message}`);
  return data;
}

// --- Main ---

async function run() {
  console.log('\n🧪 Verification Flow Tests\n');

  const campaignId = await getOrCreateCampaign();
  console.log(`   Campaign ID: ${campaignId}`);

  // 5 wallets
  const wallets = [
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
    ethers.Wallet.createRandom(),
  ];
  const addrs = wallets.map((w) => w.address);
  console.log('   Wallets:');
  addrs.forEach((a, i) => console.log(`     ${i + 1}: ${a}`));

  // Trust network: 1 and 2 are friends (1 trusts 2)
  const { error: trustError } = await supabase.from('trust_relations').insert({
    truster_address: addrs[0],
    trustee_address: addrs[1],
  });
  if (trustError) {
    if (trustError.code !== '23505') throw new Error(`Trust relation failed: ${trustError.message}`);
  }
  console.log('   Trust network: wallet1 trusts wallet2 (friends)\n');

  // ---------- Case 1: 3 submissions, 1 golden. All truthy. Golden good. Show prize distribution ----------
  console.log('--- Case 1: 3 submissions, 1 golden, all truthy, golden good ---');
  const sub1a = await createSubmission(campaignId, addrs[2], { status: 'NEEDS_HUMAN_REVIEW' });
  const sub1b = await createSubmission(campaignId, addrs[3], { status: 'NEEDS_HUMAN_REVIEW' });
  const sub1Golden = await createSubmission(campaignId, addrs[4], { status: 'NEEDS_HUMAN_REVIEW' });
  await setGoldenTask(sub1Golden.id, 'APPROVE');

  await vote(sub1a.id, addrs[0], 'APPROVE');
  await vote(sub1a.id, addrs[1], 'APPROVE');
  await vote(sub1a.id, addrs[3], 'APPROVE');
  await vote(sub1b.id, addrs[0], 'APPROVE');
  await vote(sub1b.id, addrs[1], 'APPROVE');
  await vote(sub1b.id, addrs[2], 'APPROVE');
  await vote(sub1Golden.id, addrs[0], 'APPROVE');
  await vote(sub1Golden.id, addrs[1], 'APPROVE');
  await vote(sub1Golden.id, addrs[2], 'APPROVE');

  const sub1aAfter = await getSubmission(sub1a.id);
  const sub1bAfter = await getSubmission(sub1b.id);
  const sub1GoldenAfter = await getSubmission(sub1Golden.id);
  console.log(`   Sub1a status: ${sub1aAfter.status} (expected APPROVED)`);
  console.log(`   Sub1b status: ${sub1bAfter.status} (expected APPROVED)`);
  console.log(`   Golden status: ${sub1GoldenAfter.status} (expected APPROVED)`);
  await showPrizeDistribution(campaignId);
  console.log('');

  // ---------- Case 2: 3 submissions, 1 golden. Majority correct, non-friend lies on golden. AI high confidence. Show prize distribution ----------
  console.log('--- Case 2: Majority correct, non-friend lies on golden task, AI high confidence ---');
  const sub2a = await createSubmission(campaignId, addrs[3], {
    status: 'NEEDS_HUMAN_REVIEW',
    ai_confidence: 90,
  });
  const sub2b = await createSubmission(campaignId, addrs[4], {
    status: 'NEEDS_HUMAN_REVIEW',
    ai_confidence: 88,
  });
  const sub2Golden = await createSubmission(campaignId, addrs[4], {
    status: 'NEEDS_HUMAN_REVIEW',
    ai_confidence: 92,
  });
  await setGoldenTask(sub2Golden.id, 'APPROVE');
  // Validators: 0, 1, 2 vote (none is submitter). Non-friend validator 2 lies (REJECT on golden).
  await vote(sub2a.id, addrs[0], 'APPROVE');
  await vote(sub2a.id, addrs[1], 'APPROVE');
  await vote(sub2a.id, addrs[2], 'APPROVE');
  await vote(sub2b.id, addrs[0], 'APPROVE');
  await vote(sub2b.id, addrs[1], 'APPROVE');
  await vote(sub2b.id, addrs[2], 'APPROVE');
  await vote(sub2Golden.id, addrs[0], 'APPROVE');
  await vote(sub2Golden.id, addrs[1], 'APPROVE');
  await vote(sub2Golden.id, addrs[2], 'REJECT'); // non-friend 2 lies on golden (expected APPROVE)

  const sub2GoldenAfter = await getSubmission(sub2Golden.id);
  console.log(`   Golden (expected APPROVE, validator 2 voted REJECT) status: ${sub2GoldenAfter.status} (majority APPROVE => APPROVED)`);
  await showPrizeDistribution(campaignId);
  console.log('');

  // ---------- Case 3: AI low confidence ----------
  console.log('--- Case 3: AI low confidence ---');
  const sub3 = await createSubmission(campaignId, addrs[4], {
    status: 'REJECTED',
    ai_confidence: 25,
  });
  console.log(`   Submission created with ai_confidence=25, status=REJECTED (simulated low-confidence path)`);
  console.log(`   Sub3 id: ${sub3.id}, status: ${sub3.status}`);
  console.log('');

  // ---------- Case 4: 1 friend lies on submission. AI high confidence ----------
  console.log('--- Case 4: 1 friend lies on submission, AI high confidence ---');
  const sub4 = await createSubmission(campaignId, addrs[1], {
    status: 'NEEDS_HUMAN_REVIEW',
    ai_confidence: 91,
  });
  // Submitter is addrs[1]. Friends: addrs[0] and addrs[1] (0 trusts 1). So validator 0 is friend of submitter 1.
  // Friend 0 votes REJECT; others vote APPROVE. Majority = 2 APPROVE => APPROVED.
  await vote(sub4.id, addrs[0], 'REJECT'); // friend lies
  await vote(sub4.id, addrs[2], 'APPROVE');
  await vote(sub4.id, addrs[3], 'APPROVE');
  const sub4After = await getSubmission(sub4.id);
  console.log(`   Submitter: wallet2 (friend of wallet1). Friend wallet1 voted REJECT; others APPROVE.`);
  console.log(`   Final status: ${sub4After.status} (expected APPROVED by majority)`);
  console.log('');

  console.log('✅ Verification flow tests completed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
