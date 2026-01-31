require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Setup
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cguqjaoeleifeaxktmwv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTest() {
    console.log("🧪 Starting Oracle AI Integration Test (Live API)...");

    // 1. Setup Data
    // We need a submission to process.
    // Insert a dummy submission into `submissions` table.
    // Ensure we have a valid user_id if FK is enforced.
    // We'll reuse the logic from milestone1.test.js to find/create a user.
    
    // Create temp user to be safe
    const email = `test_oracle_${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
    });
    
    if (authError) {
        console.error("Failed to create user:", authError);
        return;
    }
    const userId = authData.user.id;
    console.log(`   User created: ${userId}`);

    // Create Campaign if needed or fetch existing
    let campaignId;
    const { data: campaigns } = await supabase.from('campaigns').select('id').limit(1);
    
    if (campaigns && campaigns.length > 0) {
        campaignId = campaigns[0].id;
        console.log(`   Using existing campaign: ${campaignId}`);
    } else {
        // Create one if allowed, or error out
        console.error("   ❌ No campaigns found. Please create a campaign first.");
        return;
    }

    const photoUrl = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&q=80&fm=jpg&crop=entropy&cs=tinysrgb"; // Dog photo
    const campaignRules = "Must be a dog";

    // 2. Submit to Chain to get valid onchain_id
    console.log("   Submitting to Chain to create valid state...");
    const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const BOUNTYFI_ADDRESS = process.env.BOUNTYFI_ADDRESS;

    if (!PRIVATE_KEY || !BOUNTYFI_ADDRESS) {
        console.error("   ❌ Missing PRIVATE_KEY or BOUNTYFI_ADDRESS");
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const abi = [
        "function createCampaign(uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold) external",
        "function submit(uint256 _campaignId, bytes32 _submissionHash) external",
        "function campaigns(uint256) external view returns (uint8, uint256, uint256, uint256, uint256, bool)",
        "event CampaignCreated(uint256 indexed campaignId, uint8 campaignType, uint256 rewardAmount)",
        "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)"
    ];
    const contract = new ethers.Contract(BOUNTYFI_ADDRESS, abi, wallet);

    // Create On-Chain Campaign or use existing
    let onChainCampaignId = 0;
    try {
        // Try to use ID 0 first
        const c0 = await contract.campaigns(0);
        if (c0 && c0[5] === true) {
            console.log("   ✅ Using existing active Campaign ID 0");
            onChainCampaignId = 0;
        } else {
            console.log("   Creating New On-Chain Campaign...");
            const txCamp = await contract.createCampaign(0, 0, 0, 100, 80);
            const receiptCamp = await txCamp.wait();
            const logCamp = receiptCamp.logs.find(l => {
                 try { return contract.interface.parseLog(l).name === 'CampaignCreated'; } catch { return false; }
            });
            if (logCamp) {
                onChainCampaignId = contract.interface.parseLog(logCamp).args.campaignId;
                console.log(`   ✅ On-Chain Campaign Created: ID ${onChainCampaignId}`);
            }
        }
    } catch (e) {
        console.warn("   ⚠️ Failed to setup campaign:", e.message);
    }

    const submissionHash = ethers.hexlify(ethers.randomBytes(32));
    let onChainId;

    try {
        const tx = await contract.submit(onChainCampaignId, submissionHash);
        console.log(`   Tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        
        // Parse logs
        const log = receipt.logs.find(l => {
            try { return contract.interface.parseLog(l).name === 'SubmissionCreated'; } 
            catch { return false; }
        });
        
        if (log) {
            const parsed = contract.interface.parseLog(log);
            onChainId = parsed.args.submissionId.toString();
            console.log(`   ✅ On-Chain Submission ID: ${onChainId}`);
        } else {
            console.error("   ❌ Could not find SubmissionCreated event");
            return;
        }
    } catch (e) {
        console.error("   ❌ Chain Submission Failed:", e);
        return;
    }

    // Insert Submission with REAL onchain_id
    const { data: sub, error: subError } = await supabase
        .from('submissions')
        .insert({
            campaign_id: campaignId,
            user_id: userId,
            photo_url: photoUrl,
            gps_lat: 40.7,
            gps_lng: -74.0,
            status: 'PENDING', 
            onchain_id: onChainId, 
            photo_hash: submissionHash
        })
        .select()
        .single();

    if (subError) {
        console.error("Failed to insert submission:", subError);
        return;
    }
    console.log(`   Submission created: ${sub.id}`);

    // 2. Invoke Oracle AI Function
    // We invoke directly to test the function logic, avoiding trigger delays (though trigger might also fire).
    console.log("   Invoking oracle_ai...");
    
    const { data: funcData, error: funcError } = await supabase.functions.invoke('oracle_ai', {
        body: {
            submission_id: sub.id,
            photo_url: photoUrl,
            campaign_rules: campaignRules,
            mock: true
        }
    });

    if (funcError) {
        console.error("   Function invocation failed:", funcError);
        return;
    }
    
    console.log("   Function response:", funcData);
    
    // 3. Verify Result
    if (!funcData.success) {
        console.error("   Oracle returned failure:", funcData.error);
        return;
    }

    console.log(`   Confidence Score: ${funcData.confidence}`);
    
    // Check DB update
    const { data: verdict, error: verdictError } = await supabase
        .from('ai_verdicts')
        .select('*')
        .eq('submission_id', sub.id)
        .single();

    if (verdictError) {
        console.error("   Failed to fetch verdict:", verdictError);
    } else {
        console.log("   ✅ Verdict found in DB:", verdict.confidence);
        if (verdict.confidence > 80) {
            console.log("   ✅ Confidence high (Expected for dog photo)");
        } else {
            console.warn("   ⚠️ Confidence low - check model performance");
        }
    }

    console.log("Test Complete.");
}

runTest();
