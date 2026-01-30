require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 
const BOUNTYFI_ADDRESS = process.env.BOUNTYFI_ADDRESS;

if (!SUPABASE_URL || !SERVICE_KEY || !PRIVATE_KEY || !BOUNTYFI_ADDRESS) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wrapperWallet = new ethers.Wallet(PRIVATE_KEY, provider); // Oracle / Submitter Admin

async function runTest() {
    console.log("🚀 Starting Voting & Finalization Test...");

    // 1. Setup Contracts
    const abiBountyFi = [
        "function createCampaign(uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold) external",
        "function submit(uint256 _campaignId, bytes32 _submissionHash) external",
        "function campaigns(uint256) external view returns (uint8, uint256, uint256, uint256, uint256, bool)",
        "function submissions(uint256) external view returns (uint256, address, bytes32, uint8, uint256, uint256, uint256, uint256)",
        "function vote(uint256 _submissionId, bool _approve) external",
        "function finalizeSubmission(uint256 _submissionId, address _recipient) external",
        "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)",
        "event Finalized(uint256 indexed submissionId, uint8 status)"
    ];

    const contract = new ethers.Contract(BOUNTYFI_ADDRESS, abiBountyFi, wrapperWallet);
    
    // 2. Ensure Active Campaign & Create Subs
    console.log("   Using Campaign ID 0...");
    try {
        const camp0 = await contract.campaigns(0);
        if (!camp0[5]) { console.error("   ❌ Campaign 0 inactive"); return; }
    } catch (e) {
        console.error("   ❌ Failed to fetch campaign:", e.message);
        return;
    }
    
    const submissionHash = ethers.hexlify(ethers.randomBytes(32));
    let onChainId;
    
    // Submit
    console.log("   Submitting task...");
    try {
        const tx = await contract.submit(0, submissionHash);
        const receipt = await tx.wait();
        const log = receipt.logs.find(l => {
             try { return contract.interface.parseLog(l).name === 'SubmissionCreated'; } catch { return false; }
        });
        onChainId = contract.interface.parseLog(log).args.submissionId;
        console.log(`   ✅ Submission Created: ID ${onChainId}`);
    } catch (e) {
        console.error("   ❌ Submit failed:", e); return;
    }

    // Insert DB
    const { data: campData } = await supabase.from('campaigns').select('id').limit(1).single();
    if (!campData) { console.error("No campaign in DB"); return; }

    console.log("   Creating DB Record...");
    // Create User First to ensure FK validity
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
       email: `voter_${Date.now()}@test.com`,
       password: 'password123',
       email_confirm: true
    });
    
    if (authError) {
        console.error("   ❌ Failed to create test user:", authError);
        return;
    }
    const userId = authData.user.id;

    console.log("   Creating DB Record...");
    const { data: sub, error: insertError } = await supabase.from('submissions').insert({
        campaign_id: campData.id,
        gps_lat: 40.7, gps_lng: -74.0,
        photo_url: "http://example.com/vote_test.jpg",
        photo_hash: submissionHash,
        user_id: userId,
        onchain_id: onChainId.toString(),
        status: 'PENDING'
    }).select().single();

    if (insertError) {
        console.error("   ❌ DB Insert failed:", insertError);
        return; 
    }

    // 3. Oracle -> JURY_VOTING
    console.log("   🤖 Oracle verifying (Mock Confidence 60 -> Jury)...");
    const { data: fnData, error: fnError } = await supabase.functions.invoke('oracle_ai', {
        body: {
            submission_id: sub ? sub.id : "mock_id",
            photo_url: "http://example.com/vote_test.jpg",
            campaign_rules: "Check",
            mock: true,
            mock_confidence: 60
        }
    });
    if (fnError) console.error("Oracle Function Error:", fnError);
    else console.log("   🤖 Oracle Response:", fnData);

    // Wait for Oracle to update Chain
    console.log("   ⏳ Waiting for Oracle to update status to JURY_VOTING...");
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
            const subData = await contract.submissions(onChainId);
            console.log(`      Current Status: ${subData[3]} (Expected 2)`);
            if (subData[3] == 2n) {
                console.log("   ✅ Status updated to JURY_VOTING");
                break;
            }
        } catch (e) {
            console.warn("      ⚠️ Failed to fetch submission status checking again...", e.message);
        }
        process.stdout.write(".");
    }
    
    console.log("   🗳️  Validator 1 Voting (Main Wallet)...");
    try {
        const txVote = await contract.vote(onChainId, true);
        await txVote.wait();
        console.log("      ✅ Voted Approved");
    } catch(e) {
        console.error("      ❌ Vote failed:", e.message); 
        return;
    }
    
    // Verify Vote Count
    const subStruct = await contract.submissions(onChainId);
    console.log(`      Current Votes: Approve=${subStruct[5]}, Reject=${subStruct[6]}`);
    
    if (subStruct[5] == 1n) {
        console.log("   ✅ Vote recorded successfully.");
    } else {
        console.error("   ❌ Vote not recorded.");
    }
}

runTest();
