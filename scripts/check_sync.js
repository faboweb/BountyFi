
const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOUNTYFI_ADDRESS = process.env.BOUNTYFI_ADDRESS;
const RPC_URL = 'https://sepolia.base.org';

const ABI = [
    "function nextCampaignId() view returns (uint256)",
    "function campaigns(uint256) view returns (string title, uint8 campaignType, uint256 rewardAmount, uint256 stakeAmount, uint256 radiusM, uint256 aiThreshold, bool active)"
];

async function checkSync() {
    console.log('--- BountyFi Sync Audit ---');
    console.log('Contract:', BOUNTYFI_ADDRESS);
    console.log('RPC:', RPC_URL);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(BOUNTYFI_ADDRESS, ABI, provider);
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        const nextId = await contract.nextCampaignId();
        console.log(`On-chain campaigns count: ${nextId}`);

        const { data: dbCampaigns, error } = await supabase
            .from('campaigns')
            .select('onchain_id, title, status');

        if (error) throw error;

        const dbIds = new Set(dbCampaigns.map(c => String(c.onchain_id)));
        console.log(`Database campaigns count (with onchain_id): ${dbIds.size}`);

        const missing = [];
        for (let i = 0; i < Number(nextId); i++) {
            if (!dbIds.has(String(i))) {
                const c = await contract.campaigns(i);
                missing.push({ id: i, title: c.title });
            }
        }

        if (missing.length === 0) {
            console.log('✅ All on-chain campaigns are present in the database.');
        } else {
            console.log(`❌ Found ${missing.length} missing campaigns:`);
            missing.forEach(m => {
                console.log(`  - ID ${m.id}: "${m.title}"`);
            });
        }

    } catch (err) {
        console.error('Error during audit:', err);
    }
}

checkSync();
