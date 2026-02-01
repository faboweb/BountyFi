/**
 * Add a campaign as pending in Supabase (by tx hash) and optionally trigger the indexer to sync from chain.
 * Usage: node scripts/add_pending_campaign_and_sync.js [campaignId]
 *   If campaignId is omitted, tries to read it from the tx receipt (Base Sepolia). If tx not found, still inserts pending row.
 * Uses .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, (optional) RPC_URL
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

const TX_HASH = '0xc6048bf6088f84c7dbfbb810abc11956c7b723b4ce1c9232d7a40fedaf0eb1c';
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

// Some RPCs require 64 hex chars; normalize for getTransactionReceipt only
function normalizeTxHash(h) {
  const hex = h.replace(/^0x/i, '');
  if (hex.length === 63) return '0x0' + hex;
  return h;
}

async function getCampaignIdFromTx(provider, txHash) {
  const normalized = normalizeTxHash(txHash);
  const receipt = await provider.getTransactionReceipt(normalized);
  if (!receipt) return null;
  const iface = new ethers.Interface([
    'event CampaignCreated(uint256 indexed campaignId, string title, uint8 campaignType, uint256 rewardAmount, uint256 prizeCount)',
  ]);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === 'CampaignCreated') {
        return parsed.args.campaignId.toString();
      }
    } catch (_) {
      continue;
    }
  }
  return null;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  let campaignId = process.argv[2];
  if (!campaignId) {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      console.log('Fetching campaignId from tx', TX_HASH, '...');
      campaignId = await getCampaignIdFromTx(provider, TX_HASH);
    } catch (e) {
      console.warn('RPC/tx error:', e.message);
    }
    if (!campaignId) console.warn('Could not get campaignId from tx. Will still insert pending; pass campaignId as first arg to run indexer.');
  } else {
    console.log('Using campaignId from arg:', campaignId);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // If campaignId was provided, only invoke indexer (pending row should already exist)
  if (campaignId && process.argv[2]) {
    const invokeUrl = `${supabaseUrl}/functions/v1/indexer`;
    const res = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        event: 'sync_campaign',
        campaignId,
        transactionHash: TX_HASH,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Indexer invoke failed:', res.status, text);
      process.exit(1);
    }
    console.log('Indexer response:', text);
    const { data: updated } = await supabase.from('campaigns').select('*').eq('tx_hash', TX_HASH).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (updated) console.log('Campaign after sync:', JSON.stringify(updated, null, 2));
    return;
  }

  const row = {
    title: `Test pending from tx ${TX_HASH.slice(0, 10)}...`,
    description: null,
    prize_total: null,
    prize_pool: null,
    min_funding_thb: null,
    requires_face_recognition: false,
    start_date: null,
    end_date: null,
    deadline: null,
    checkpoints: null,
    status: 'pending_onchain',
    donator_id: null,
    current_pool: 0,
    tx_hash: TX_HASH,
    campaign_type: 'SINGLE_PHOTO',
    reward_amount: 0,
    stake_amount: 0,
    radius_m: 50,
    ai_threshold: 80,
  };

  const { data: campaign, error: insertError } = await supabase
    .from('campaigns')
    .insert(row)
    .select()
    .single();

  if (insertError) {
    console.error('Insert error:', insertError);
    process.exit(1);
  }
  console.log('Inserted pending campaign:', campaign.id);

  if (campaignId) {
    const invokeUrl = `${supabaseUrl}/functions/v1/indexer`;
    const res = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        event: 'sync_campaign',
        campaignId,
        transactionHash: TX_HASH,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Indexer invoke failed:', res.status, text);
      process.exit(1);
    }
    console.log('Indexer response:', text);
    const updated = await supabase.from('campaigns').select('*').eq('id', campaign.id).single();
    console.log('Campaign after sync:', JSON.stringify(updated.data, null, 2));
  } else {
    console.log('To sync from chain, run: node scripts/add_pending_campaign_and_sync.js <campaignId>');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
