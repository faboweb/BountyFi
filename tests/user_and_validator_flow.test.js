require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // User A (Submitter)
const BOUNTYFI_ADDRESS = process.env.BOUNTYFI_ADDRESS;
// Use a different key for Validator if possible, or just same one for connectivity test (self-check?)
// Contract prevents voting on own? "Skip own: if (sub.submitter == _validator) continue;"
// We need a SECOND wallet for Validator. I'll generate a random one for the "Validator" view call (since it's view, no gas needed).
// Wait, `getValidationTask` is a view function but relies on `msg.sender`? No, it takes `address _validator` as arg.
// Perfect.

if (!SUPABASE_URL || !SERVICE_KEY || !PRIVATE_KEY || !BOUNTYFI_ADDRESS) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wrapperWallet = new ethers.Wallet(PRIVATE_KEY, provider); // Submitter

async function runTest() {
    console.log("🚀 Starting User & Validator Flow Test...");

    // 1. Setup Contracts
    const abi = [
        "function createCampaign(uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold) external",
        "function submit(uint256 _campaignId, bytes32 _submissionHash) external",
        "function campaigns(uint256) external view returns (uint8, uint256, uint256, uint256, uint256, bool)",
        "function getValidationTask(address _validator) external view returns (uint256)",
        "event CampaignCreated(uint256 indexed campaignId, uint8 campaignType, uint256 rewardAmount)",
        "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)"
    ];
    const contract = new ethers.Contract(BOUNTYFI_ADDRESS, abi, wrapperWallet);

    // 2. Ensure Active Campaign (Use 0)
    console.log("   Using Campaign ID 0...");
    const camp0 = await contract.campaigns(0);
    if (!camp0[5]) {
         console.error("   ❌ Campaign 0 is not active. Run oracle_ai.test.js first to setup.");
         return;
    }

    // 3. User Submits Task
    console.log("   👤 User submitting task...");
    const submissionHash = ethers.hexlify(ethers.randomBytes(32));
    let onChainId;
    let userId;

    try {
        const tx = await contract.submit(0, submissionHash);
        console.log(`      Tx: ${tx.hash}`);
        const receipt = await tx.wait();
        const log = receipt.logs.find(l => {
             try { return contract.interface.parseLog(l).name === 'SubmissionCreated'; } catch { return false; }
        });
        onChainId = contract.interface.parseLog(log).args.submissionId.toString();
        console.log(`      ✅ Submission Created: ID ${onChainId}`);
    } catch (e) {
        console.error("   ❌ Submission failed:", e);
        return;
    }

    // 4. Create DB Record (Mock Client App)
    console.log("   💾 Creating DB Record...");
    // Create random user
    const { data: authData } = await supabase.auth.admin.createUser({
       email: `user_${Date.now()}@test.com`,
       password: 'password123',
       email_confirm: true
    });
    userId = authData.user.id;

    // Fetch valid campaign UUID
    const { data: campData, error: campError } = await supabase
        .from('campaigns')
        .select('id')
        .limit(1)
        .single();
    
    if (campError || !campData) {
        console.error("   ❌ Failed to fetch campaign UUID:", campError);
        return;
    }
    const campaignUuid = campData.id;

    const { data: sub, error: insertError } = await supabase.from('submissions').insert({
        campaign_id: campaignUuid,
        gps_lat: 40.7, gps_lng: -74.0,
        photo_url: "http://example.com/check.jpg",
        photo_hash: submissionHash,
        user_id: userId,
        status: 'PENDING',
        onchain_id: onChainId
    }).select().single();
    
    if (insertError) {
        console.error("   ❌ Insert Failed:", insertError);
        return;
    }
    
    // 5. Oracle Verifies (Mock MID confidence)
    console.log("   🤖 Oracle verifying (Mock Confidence 60 -> Jury)...");
    const { data: funcData, error: funcError } = await supabase.functions.invoke('oracle_ai', {
        body: {
            submission_id: sub ? sub.id : "mock_if_failed", 
            // If DB insert failed, this fails. We need robust test.
            // Let's assume insert worked for now or fix in step 4 block.
            photo_url: "http://example.com/check.jpg",
            campaign_rules: "Check",
            mock: true,
            mock_confidence: 60 // Trigger Jury
        }
    });

    if (funcError) {
        console.error("   ❌ Oracle Failed:", funcError);
    } else {
        console.log("   ✅ Oracle Result:", funcData);
    }

    // 6. Validator Retrieval
    console.log("   🕵️ Validator retrieving task...");
    const randomValidator = ethers.Wallet.createRandom().address;
    console.log(`      Validator: ${randomValidator}`);

    try {
        const taskId = await contract.getValidationTask(randomValidator);
        console.log(`      Task ID Returned: ${taskId.toString()}`);
        
        if (taskId.toString() === onChainId.toString()) {
            console.log("      ✅ SUCCESS: Validator received the correct task!");
        } else {
            console.error(`      ❌ FAILURE: Expected ${onChainId}, got ${taskId}`);
             // Could happen if other tasks are pending.
        }
    } catch (e) {
        console.error("   ❌ Retrieval Logic Failed:", e);
    }

}

runTest();
