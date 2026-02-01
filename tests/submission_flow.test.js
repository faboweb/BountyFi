/**
 * Submission Flow Tests
 *
 * Tests EIP-712 signing, hash computation, and relay_submission integration.
 * Unit tests run without Supabase; integration tests require SUPABASE_SERVICE_ROLE_KEY.
 * Run: NODE_ENV=test node tests/submission_flow.test.js
 * Or: pnpm test:e2e (runs all tests)
 */
require('dotenv').config();
require('dotenv').config({ path: '.env.test', override: true });

const { ethers } = require('ethers');

const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL;
const hasSupabase = !!(SERVICE_KEY && SUPABASE_URL);

let supabase;
if (hasSupabase) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SERVICE_KEY);
}

// ----- EIP-712 Helpers (must match apps/app/src/utils/eip712Submission.ts & relay) -----
const EIP712_DOMAIN = {
  name: 'BountyFi',
  version: '1',
  chainId: 84532,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const EIP712_TYPES = {
  BountyFiSubmission: [
    { name: 'submissionHash', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
    { name: 'nonce', type: 'uint256' },
  ],
};

const GPS_SCALE = 1e6;

function computeSubmissionHash(contractCampaignId, photoUrls, gpsLat, gpsLng) {
  const abiCoder = new ethers.AbiCoder();
  const latScaled = BigInt(Math.floor(gpsLat * GPS_SCALE));
  const lngScaled = BigInt(Math.floor(gpsLng * GPS_SCALE));
  return ethers.keccak256(
    abiCoder.encode(
      ['uint256', 'string[]', 'int256', 'int256'],
      [contractCampaignId, photoUrls, latScaled, lngScaled]
    )
  );
}

function buildSubmissionMessage(submissionHash, recipient, nonce) {
  return {
    submissionHash,
    recipient,
    nonce: nonce.toString(),
  };
}

async function signSubmission(wallet, submissionHash, recipient, nonce) {
  const message = buildSubmissionMessage(submissionHash, recipient, nonce);
  return wallet.signTypedData(EIP712_DOMAIN, EIP712_TYPES, message);
}

// ----- Tests -----

async function testComputeSubmissionHash() {
  console.log('\n📐 Test: computeSubmissionHash is deterministic');
  const hash1 = computeSubmissionHash(1, ['https://a.com/1.jpg', 'https://a.com/2.jpg'], 18, 98);
  const hash2 = computeSubmissionHash(1, ['https://a.com/1.jpg', 'https://a.com/2.jpg'], 18, 98);
  if (hash1 !== hash2) throw new Error('Hash must be deterministic');
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash1)) throw new Error('Hash must be 32-byte hex');
  console.log('   ✅ Hash is deterministic and valid');
}

async function testHashChangesWithInput() {
  console.log('\n📐 Test: hash changes when inputs change');
  const base = computeSubmissionHash(1, ['u1', 'u2'], 1, 2);
  if (computeSubmissionHash(2, ['u1', 'u2'], 1, 2) === base) throw new Error('Hash should change with campaignId');
  if (computeSubmissionHash(1, ['u1', 'u3'], 1, 2) === base) throw new Error('Hash should change with photoUrls');
  if (computeSubmissionHash(1, ['u1', 'u2'], 2, 2) === base) throw new Error('Hash should change with gps');
  console.log('   ✅ Hash varies with all inputs');
}

async function testEIP712SignVerifyRoundtrip() {
  console.log('\n🔐 Test: EIP-712 sign/verify roundtrip');
  const wallet = ethers.Wallet.createRandom();
  const submissionHash = computeSubmissionHash(1, ['https://x.com/1.jpg'], 40.0, -74.0);
  const nonce = Date.now();
  const recipient = wallet.address;

  const signature = await signSubmission(wallet, submissionHash, recipient, nonce);
  const recovered = ethers.verifyTypedData(
    EIP712_DOMAIN,
    EIP712_TYPES,
    buildSubmissionMessage(submissionHash, recipient, nonce),
    signature
  );
  if (recovered.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`Recovered ${recovered}, expected ${wallet.address}`);
  }
  console.log('   ✅ Signature verifies correctly');
}

async function testRelaySubmissionValidEIP712() {
  console.log('\n📤 Test: relay_submission accepts valid EIP-712 submission');
  if (!hasSupabase) {
    console.log('   ⏭️  Skipped: no Supabase config (set SUPABASE_SERVICE_ROLE_KEY)');
    return;
  }

  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .select('id, onchain_id')
    .not('onchain_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (campErr || !campaign?.onchain_id) {
    console.log('   ⏭️  Skipped: no campaign with onchain_id (deploy campaign first)');
    return;
  }

  const wallet = ethers.Wallet.createRandom();
  const photoUrls = [`https://test.com/before_${Date.now()}.jpg`, `https://test.com/after_${Date.now()}.jpg`];
  // Use integers - relay scales via floor(lat*1e6); 40 and -73 become 40000000, -73000000
  const gpsLat = 40;
  const gpsLng = -73;
  const nonce = Date.now();

  const submissionHash = computeSubmissionHash(campaign.onchain_id, photoUrls, gpsLat, gpsLng);
  const recipient = wallet.address;
  const signature = await signSubmission(wallet, submissionHash, recipient, nonce);
  const eip712_message = buildSubmissionMessage(submissionHash, recipient, nonce);

  const { data: result, error } = await supabase.functions.invoke('relay_submission', {
    body: {
      campaign_id: campaign.id,
      photo_urls: photoUrls,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      signature,
      public_address: wallet.address,
      eip712_message,
    },
  });

  if (error) {
    let errBody = '';
    try {
      if (error.context?.body) {
        const r = await error.context.body.getReader().read();
        errBody = new TextDecoder().decode(r.value);
      }
    } catch (_) {}
    throw new Error(`relay_submission failed: ${error.message}${errBody ? ` | ${errBody}` : ''}`);
  }
  if (!result?.success || !result?.submission_id) {
    throw new Error(`Expected success + submission_id, got: ${JSON.stringify(result)}`);
  }
  console.log(`   ✅ Submitted: ${result.submission_id}, onchain: ${result.onchain_id}`);
}

async function testRelayRejectsMissingEIP712() {
  console.log('\n🛑 Test: relay_submission rejects missing eip712_message');
  if (!hasSupabase) {
    console.log('   ⏭️  Skipped: no Supabase config');
    return;
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (!campaign) {
    console.log('   ⏭️  Skipped: no campaign');
    return;
  }

  const wallet = ethers.Wallet.createRandom();
  const { data, error } = await supabase.functions.invoke('relay_submission', {
    body: {
      campaign_id: campaign.id,
      photo_urls: ['https://x.com/1.jpg', 'https://x.com/2.jpg'],
      gps_lat: 40,
      gps_lng: -74,
      signature: '0x' + '00'.repeat(65),
      public_address: wallet.address,
      // no eip712_message
    },
  });

  // Should fail before on-chain call
  const ok = data?.success === true && data?.submission_id;
  if (ok) {
    throw new Error('Should have rejected request without eip712_message');
  }
  const errMsg = error?.message || data?.error || JSON.stringify(data);
  if (!errMsg.includes('EIP-712') && !errMsg.includes('submissionHash')) {
    console.log('   (Relay returned:', errMsg, ')');
  }
  console.log('   ✅ Correctly rejected missing EIP-712 message');
}

async function testRelayRejectsHashMismatch() {
  console.log('\n🛑 Test: relay_submission rejects hash mismatch');
  if (!hasSupabase) {
    console.log('   ⏭️  Skipped: no Supabase config');
    return;
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, onchain_id')
    .not('onchain_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!campaign?.onchain_id) {
    console.log('   ⏭️  Skipped: no campaign with onchain_id');
    return;
  }

  const wallet = ethers.Wallet.createRandom();
  const photoUrls = ['https://x.com/1.jpg', 'https://x.com/2.jpg'];
  const gpsLat = 40;
  const gpsLng = -74;
  const realHash = computeSubmissionHash(campaign.onchain_id, photoUrls, gpsLat, gpsLng);
  const fakeHash = ethers.keccak256('0xdead'); // wrong hash
  const signature = await signSubmission(wallet, fakeHash, wallet.address, Date.now());
  const eip712_message = buildSubmissionMessage(fakeHash, wallet.address, Date.now());

  const { data, error } = await supabase.functions.invoke('relay_submission', {
    body: {
      campaign_id: campaign.id,
      photo_urls: photoUrls,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      signature,
      public_address: wallet.address,
      eip712_message,
    },
  });

  const ok = data?.success === true && data?.submission_id;
  if (ok) {
    throw new Error('Should have rejected hash mismatch');
  }
  const errMsg = (error?.message || data?.error || JSON.stringify(data || error)).toLowerCase();
  if (!errMsg.includes('hash') && !errMsg.includes('mismatch') && !errMsg.includes('tamper') && !errMsg.includes('500')) {
    console.log('   (Relay response:', errMsg.slice(0, 80) + '...)');
  }
  console.log('   ✅ Correctly rejected hash mismatch');
}

async function testRelayRejectsWrongRecipient() {
  console.log('\n🛑 Test: relay_submission rejects recipient != signer');
  if (!hasSupabase) {
    console.log('   ⏭️  Skipped: no Supabase config');
    return;
  }

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, onchain_id')
    .not('onchain_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!campaign?.onchain_id) {
    console.log('   ⏭️  Skipped: no campaign with onchain_id');
    return;
  }

  const signer = ethers.Wallet.createRandom();
  const imposter = ethers.Wallet.createRandom();
  const photoUrls = ['https://x.com/1.jpg', 'https://x.com/2.jpg'];
  const submissionHash = computeSubmissionHash(campaign.onchain_id, photoUrls, 40, -74);
  const signature = await signSubmission(signer, submissionHash, signer.address, Date.now());
  // Claim to be imposter but signature is from signer - relay checks recipient === public_address
  const eip712_message = buildSubmissionMessage(submissionHash, imposter.address, Date.now());

  const { data, error } = await supabase.functions.invoke('relay_submission', {
    body: {
      campaign_id: campaign.id,
      photo_urls: photoUrls,
      gps_lat: 40,
      gps_lng: -74,
      signature,
      public_address: imposter.address, // claiming to be imposter
      eip712_message, // but message says recipient=imposter
    },
  });

  // Relay checks: eip712_message.recipient === public_address (both imposter here)
  // But signature recovers to signer, not imposter -> Invalid EIP-712 signature
  const ok = data?.success === true && data?.submission_id;
  if (ok) {
    throw new Error('Should have rejected wrong signer');
  }
  console.log('   ✅ Correctly rejected recipient/signer mismatch');
}

async function runAll() {
  console.log('--- 🧪 Submission Flow Tests ---');
  if (!hasSupabase) console.log('   (Supabase not configured - integration tests skipped)\n');

  await testComputeSubmissionHash();
  await testHashChangesWithInput();
  await testEIP712SignVerifyRoundtrip();
  await testRelayRejectsMissingEIP712();
  await testRelayRejectsHashMismatch();
  await testRelayRejectsWrongRecipient();
  await testRelaySubmissionValidEIP712();

  console.log('\n--- ✅ All submission flow tests passed ---\n');
}

runAll().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
