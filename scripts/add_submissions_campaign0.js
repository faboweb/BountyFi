/**
 * Add submissions for campaign 0 on chain.
 * Invokes relay_submission (EIP-712 signed) for the campaign with onchain_id = 0.
 * Requires: .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Supabase Edge Function env must have RPC_URL, PRIVATE_KEY, BOUNTYFI_ADDRESS for the relay to submit on chain.
 *
 * Usage: node scripts/add_submissions_campaign0.js [count]
 * Default count: 3
 */
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// EIP-712 (must match relay_submission and eip712Submission)
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

async function addOneSubmission(supabaseClient, campaign, index) {
  const wallet = ethers.Wallet.createRandom();
  const photoUrls = [
    `https://bountyfi.test/before_${Date.now()}_${index}.jpg`,
    `https://bountyfi.test/after_${Date.now()}_${index}.jpg`,
  ];
  const gpsLat = 40 + index;
  const gpsLng = -73 - index;
  const nonce = Date.now() + index;

  const submissionHash = computeSubmissionHash(
    campaign.onchain_id,
    photoUrls,
    gpsLat,
    gpsLng
  );
  const signature = await signSubmission(
    wallet,
    submissionHash,
    wallet.address,
    nonce
  );
  const eip712_message = buildSubmissionMessage(
    submissionHash,
    wallet.address,
    nonce
  );

  const { data: result, error } = await supabaseClient.functions.invoke(
    'relay_submission',
    {
      body: {
        campaign_id: campaign.id,
        photo_urls: photoUrls,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        signature,
        public_address: wallet.address,
        eip712_message,
      },
    }
  );

  if (error) {
    let errBody = '';
    try {
      if (error.context?.body) {
        const r = await error.context.body.getReader().read();
        errBody = new TextDecoder().decode(r.value);
      }
    } catch (_) {}
    throw new Error(
      `relay_submission failed: ${error.message}${errBody ? ` | ${errBody}` : ''}`
    );
  }
  if (!result?.success) {
    throw new Error(
      `relay_submission returned error: ${JSON.stringify(result)}`
    );
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const count = Math.min(parseInt(args[0] || '3', 10) || 3, 10);
  const wantOnchainId = process.argv.includes('--onchain-id=0')
    ? 0
    : parseInt(process.argv.find((a) => a.startsWith('--onchain-id='))?.split('=')[1], 10);

  // Prefer campaign with onchain_id = 0; else first campaign with any onchain_id
  let campaign;
  if (wantOnchainId !== undefined && !Number.isNaN(wantOnchainId)) {
    const { data, error: campErr } = await supabase
      .from('campaigns')
      .select('id, onchain_id, title')
      .eq('onchain_id', wantOnchainId)
      .maybeSingle();
    if (campErr) {
      console.error('Campaign fetch failed:', campErr.message);
      process.exit(1);
    }
    campaign = data;
  }
  if (!campaign) {
    const { data: list, error: listErr } = await supabase
      .from('campaigns')
      .select('id, onchain_id, title')
      .not('onchain_id', 'is', null)
      .order('onchain_id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (listErr) {
      console.error('Campaign fetch failed:', listErr.message);
      process.exit(1);
    }
    campaign = list;
  }
  if (!campaign) {
    console.error(
      'No campaign with onchain_id found. Deploy a campaign and sync its onchain_id first.'
    );
    process.exit(1);
  }

  console.log(
    `Adding ${count} submission(s) for campaign onchain_id=${campaign.onchain_id} (DB id: ${campaign.id}, title: ${campaign.title || '(no title)'})\n`
  );

  for (let i = 0; i < count; i++) {
    try {
      const result = await addOneSubmission(supabase, campaign, i);
      console.log(
        `  ${i + 1}/${count}  DB id: ${result.submission_id}, onchain_id: ${result.onchain_id}`
      );
    } catch (e) {
      console.error(`  ${i + 1}/${count}  Error:`, e.message);
    }
    if (i < count - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
