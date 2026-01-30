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

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wrapperWallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function runTest() {
    console.log("🚀 Starting Campaign Variations Test...");

    const abiBountyFi = [
        "function createCampaign(uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold) external",
        "function submit(uint256 _campaignId, bytes32 _submissionHash) external",
        "function campaigns(uint256) external view returns (uint8, uint256, uint256, uint256, uint256, bool)",
        "event CampaignCreated(uint256 indexed campaignId, uint8 campaignType, uint256 rewardAmount)",
        "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)"
    ];

    const contract = new ethers.Contract(BOUNTYFI_ADDRESS, abiBountyFi, wrapperWallet);

    // Enum: SINGLE_PHOTO(0), TWO_PHOTO_CHANGE(1), CHECKIN_SELFIE(2)
    
    // ---------------------------------------------------------
    // TEST 1: TYPE 1 (TWO_PHOTO_CHANGE)
    // ---------------------------------------------------------
    console.log("\n📷 Testing ONE: TWO_PHOTO_CHANGE (Type 1)...");
    try {
        const tx = await contract.createCampaign(1, 0, 0, 100, 80);
        const receipt = await tx.wait();
        const log = receipt.logs.find(l => {
             try { return contract.interface.parseLog(l).name === 'CampaignCreated'; } catch { return false; }
        });
        const id = contract.interface.parseLog(log).args.campaignId;
        const type = contract.interface.parseLog(log).args.campaignType;
        
        console.log(`   ✅ Campaign Created: ID ${id}, Type ${type}`);
        
        if (type != 1) throw new Error("Type mismatch");

        // Wait for activation
        console.log("   ⏳ Waiting for activation...");
        for (let i = 0; i < 5; i++) {
            const camp = await contract.campaigns(id);
            if (camp[5] === true) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        
        // Submit
        console.log("   Submitting...");
        const hash = ethers.hexlify(ethers.randomBytes(32));
        const txSub = await contract.submit(id, hash);
        await txSub.wait();
        console.log("   ✅ Submission Accepted");
    } catch (e) {
        console.error("   ❌ Failed Type 1:", e.message);
    }

    // ---------------------------------------------------------
    // TEST 2: TYPE 2 (CHECKIN_SELFIE)
    // ---------------------------------------------------------
    console.log("\n🤳 Testing TWO: CHECKIN_SELFIE (Type 2)...");
    try {
        const tx = await contract.createCampaign(2, 0, 0, 50, 90); // Different radius/threshold
        const receipt = await tx.wait();
        const log = receipt.logs.find(l => {
             try { return contract.interface.parseLog(l).name === 'CampaignCreated'; } catch { return false; }
        });
        const id = contract.interface.parseLog(log).args.campaignId;
        const type = contract.interface.parseLog(log).args.campaignType;
        
        console.log(`   ✅ Campaign Created: ID ${id}, Type ${type}`);
        
        if (type != 2) throw new Error("Type mismatch");

        // Wait for activation
        console.log("   ⏳ Waiting for activation...");
        for (let i = 0; i < 5; i++) {
            const camp = await contract.campaigns(id);
            if (camp[5] === true) break;
            await new Promise(r => setTimeout(r, 2000));
        }
        
        // Submit
        console.log("   Submitting...");
        const hash = ethers.hexlify(ethers.randomBytes(32));
        const txSub = await contract.submit(id, hash);
        await txSub.wait();
        console.log("   ✅ Submission Accepted");
        
    } catch (e) {
        console.error("   ❌ Failed Type 2:", e.message);
    }

    console.log("\n✅ Variations Test Complete");
}

runTest();
