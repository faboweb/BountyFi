/**
 * 1. Create a local wallet and fund it with ETH from PRIVATE_KEY
 * 2. Create a campaign on-chain (BountyFi.createCampaign)
 * 3. Trigger manage_campaign (CREATE_CAMPAIGN) and indexer (sync_campaign)
 *
 * Usage: node scripts/local_wallet_create_campaign.js
 * Requires .env: PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOUNTYFI_ADDRESS
 * Optional: RPC_URL (default https://sepolia.base.org)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');

const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';
const FUND_AMOUNT_ETH = '0.00015'; // Min for one createCampaign tx on Base Sepolia
const CAMPAIGN_TITLE = 'Local Wallet Test Campaign';

const BOUNTYFI_ABI = [
  'function createCampaign(string _title, uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold, tuple(string label, string image, string sponsor, bytes32 metadataHash, uint256 amount, uint256 value)[] _prizes) external',
  'function addPrize(uint256 _campaignId, tuple(string label, string image, string sponsor, bytes32 metadataHash, uint256 amount, uint256 value) _prize) external',
  'event CampaignCreated(uint256 indexed campaignId, string title, uint8 campaignType, uint256 rewardAmount, uint256 prizeCount)',
  'event PrizeAdded(uint256 indexed campaignId, uint256 indexed prizeIndex, bytes32 metadataHash, uint256 amount, uint256 value)',
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rpcUrl = process.env.RPC_URL || RPC_URL;
  const isBaseSepolia = rpcUrl.includes('sepolia.base');
  // Broadcast deployment on Base Sepolia is 0x29f866... (permissionless createCampaign); .env may point to another deployment
  const bountyFiAddress = isBaseSepolia ? (process.env.BOUNTYFI_ADDRESS_BASE_SEPOLIA || '0x29f866CDcB419DFE423eEbE74Dae83fc5CcD818f') : process.env.BOUNTYFI_ADDRESS;

  if (!privateKey || !supabaseUrl || !serviceKey || !bountyFiAddress) {
    console.error('Missing .env: PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOUNTYFI_ADDRESS');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Use funder (PRIVATE_KEY) as creator – deployed contract may still have onlyRole(CAMPAIGN_MANAGER_ROLE) on createCampaign; deployer has that role
  const creator = new ethers.Wallet(privateKey, provider);
  console.log('Creator (funder) address:', creator.address);

  const balance = await provider.getBalance(creator.address);
  console.log('Creator balance:', ethers.formatEther(balance), 'ETH');

  const minRequired = ethers.parseEther('0.0001'); // gas for createCampaign
  if (balance < minRequired) {
    console.error('Creator balance too low. Need at least', ethers.formatEther(minRequired), 'ETH on Base Sepolia.');
    console.error('Fund this address:', creator.address);
    console.error('Get testnet ETH from https://www.alchemy.com/faucets/base-sepolia and re-run.');
    process.exit(1);
  }

  // 2. Create campaign on-chain
  const contract = new ethers.Contract(bountyFiAddress, BOUNTYFI_ABI, creator);
  const rewardAmount = 0n;
  const stakeAmount = 0n;
  const radius = 50;
  const aiThreshold = 80;
  const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const prizes = [['Prize', '', 'Sponsor', zeroHash, 0n, 0n]]; // label, image, sponsor, metadataHash, amount, value

  const tx = await contract.createCampaign(
    CAMPAIGN_TITLE,
    0, // SINGLE_PHOTO
    rewardAmount,
    stakeAmount,
    radius,
    aiThreshold,
    prizes
  );
  const receipt = await tx.wait();
  console.log('Campaign created on-chain, tx:', receipt.hash);

  const iface = new ethers.Interface(BOUNTYFI_ABI);
  let campaignId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === 'CampaignCreated') {
        campaignId = parsed.args.campaignId.toString();
        break;
      }
    } catch (_) {}
  }
  if (!campaignId) {
    console.error('CampaignCreated event not found in receipt');
    process.exit(1);
  }
  console.log('Campaign ID from event:', campaignId);

  const txHash = receipt.hash;

  // 3. Trigger manage_campaign (CREATE_CAMPAIGN)
  const supabase = createClient(supabaseUrl, serviceKey);
  const manageUrl = `${supabaseUrl}/functions/v1/manage_campaign`;
  const manageRes = await fetch(manageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      action: 'CREATE_CAMPAIGN',
      title: CAMPAIGN_TITLE,
      description: 'Created by local_wallet_create_campaign.js',
      tx_hash: txHash,
      prize_total: null,
      min_funding_thb: null,
      requires_face_recognition: false,
    }),
  });
  const manageText = await manageRes.text();
  if (!manageRes.ok) {
    console.error('manage_campaign failed:', manageRes.status, manageText);
    process.exit(1);
  }
  console.log('manage_campaign response:', manageText);

  // 4. Trigger indexer (sync_campaign)
  const indexerUrl = `${supabaseUrl}/functions/v1/indexer`;
  const indexerRes = await fetch(indexerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      event: 'sync_campaign',
      campaignId,
      transactionHash: txHash,
    }),
  });
  const indexerText = await indexerRes.text();
  if (!indexerRes.ok) {
    console.error('indexer failed:', indexerRes.status, indexerText);
    process.exit(1);
  }
  console.log('indexer response:', indexerText);

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('tx_hash', txHash)
    .maybeSingle();
  console.log('Campaign in DB after sync:', JSON.stringify(campaign, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
