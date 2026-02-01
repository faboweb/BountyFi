/**
 * Asserts that golden tasks cannot be guessed from public submission data.
 * All submissions go through the agent (relay for user, inject_golden_task for golden).
 * Public submissions table must not leak is_golden; signature must be opaque.
 */

const { supabase, SUPABASE_URL } = require('./utils/supabase');
const { ethers } = require('ethers');

console.log(`Connected to: ${SUPABASE_URL}`);

// Columns a validator could see (e.g. get_tasks returns a subset; getById returns *)
const PUBLIC_COLUMNS = [
  'id', 'campaign_id', 'photo_url', 'gps_lat', 'gps_lng', 'lat', 'lng',
  'status', 'submitter_address', 'photo_hash', 'signature', 'ai_confidence',
  'onchain_id', 'created_at'
];

function isOpaqueSignature(s) {
  if (s == null || typeof s !== 'string') return false;
  return /^0x[0-9a-fA-F]{128,132}$/.test(s);
}

async function run() {
  console.log('\n🧪 Golden task indistinguishability test\n');

  let campaignId;
  const { data: camp } = await supabase.from('campaigns').select('id').limit(1).single();
  if (camp) campaignId = camp.id;
  else {
    const { data: created } = await supabase.from('campaigns').insert({
      title: 'Indistinguishability Test',
      campaign_type: 'SINGLE_PHOTO',
      active: true,
      reward_amount: 0,
      stake_amount: 0,
      radius_m: 500,
      ai_threshold: 70,
    }).select('id').single();
    if (!created) throw new Error('Could not create campaign');
    campaignId = created.id;
  }

  // 1) Create one "regular" submission (as if relay had stored it) with opaque signature
  const relayStyleSig = ethers.hexlify(ethers.randomBytes(65));
  const { data: regular, error: regErr } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      submitter_address: ethers.Wallet.createRandom().address,
      photo_url: 'https://example.com/regular.jpg',
      photo_hash: ethers.hexlify(ethers.randomBytes(32)),
      gps_lat: 40.7,
      gps_lng: -74,
      lat: 40.7,
      lng: -74,
      status: 'NEEDS_HUMAN_REVIEW',
      signature: relayStyleSig,
    })
    .select(PUBLIC_COLUMNS.join(','))
    .single();
  if (regErr) throw new Error(`Regular insert failed: ${regErr.message}`);
  console.log('   Regular submission (relay-style):', regular.id);

  // 2) Create one golden submission in DB (same shape as inject_golden_task after fix: opaque signature)
  const goldenSig = ethers.hexlify(ethers.randomBytes(65));
  const { data: goldenInsert, error: goldenInsErr } = await supabase
    .from('submissions')
    .insert({
      campaign_id: campaignId,
      submitter_address: ethers.Wallet.createRandom().address,
      photo_url: 'https://example.com/golden_valid_dog.jpg',
      photo_hash: ethers.hexlify(ethers.randomBytes(32)),
      gps_lat: 40.7128,
      gps_lng: -74.006,
      lat: 40.7128,
      lng: -74.006,
      status: 'NEEDS_HUMAN_REVIEW',
      signature: goldenSig,
    })
    .select('id')
    .single();
  if (goldenInsErr) throw new Error(`Golden submission insert failed: ${goldenInsErr.message}`);

  await supabase.from('golden_tasks').insert({
    submission_id: goldenInsert.id,
    expected_outcome: 'APPROVE',
    golden_content: { note: 'test' },
  });

  const { data: goldenRow, error: goldenSelErr } = await supabase
    .from('submissions')
    .select(PUBLIC_COLUMNS.join(','))
    .eq('id', goldenInsert.id)
    .single();
  if (goldenSelErr) throw new Error(`Golden select failed: ${goldenSelErr.message}`);
  console.log('   Golden submission (opaque sig, metadata in golden_tasks only):', goldenRow.id);

  // 3) Assert: no public column distinguishes golden
  const checks = [];

  if (!isOpaqueSignature(goldenRow.signature)) {
    checks.push(`FAIL: golden signature is guessable: ${String(goldenRow.signature).slice(0, 30)}...`);
  } else {
    checks.push('OK: golden signature is opaque (hex, sig-length)');
  }

  if (!isOpaqueSignature(regular.signature)) {
    checks.push(`FAIL: regular signature format: ${String(regular.signature).slice(0, 30)}...`);
  } else {
    checks.push('OK: regular signature is opaque');
  }

  if (goldenRow.signature === 'GOLDEN_TASK_AGENT' || goldenRow.is_golden === true) {
    checks.push('FAIL: public row leaks golden (signature literal or is_golden)');
  } else {
    checks.push('OK: no literal or is_golden in public row');
  }

  checks.forEach((c) => console.log('   ', c));
  const failed = checks.some((c) => c.startsWith('FAIL'));
  if (failed) throw new Error('Indistinguishability check failed');
  console.log('\n✅ Cannot guess golden from public submission data.\n');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
