require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 
const BOUNTYFI_ADDRESS = process.env.BOUNTYFI_ADDRESS;
const BOUNTY_TOKEN_ADDRESS = process.env.BOUNTY_TOKEN_ADDRESS;

if (!SUPABASE_URL || !SERVICE_KEY || !PRIVATE_KEY || !BOUNTYFI_ADDRESS) {
    console.error("❌ Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wrapperWallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function runTest() {
    console.log("🚀 Starting Rewards & Donations Test...");

    /* ---------------------------------------------------------
       PART 1: DONATIONS (Edge Function)
       --------------------------------------------------------- */
    console.log("\n📡 Testing Donations (Backend)...");
    
    // 1. Create a Campaign (DB Only or fetch existing)
    const { data: campData } = await supabase.from('campaigns').select('id, current_pool').limit(1).single();
    if (!campData) { console.error("   ❌ No campaign found"); return; }
    
    const initialPool = campData.current_pool || 0;
    const DONATION_AMOUNT = 500;
    
    // 1a. Create User
    const { data: authData } = await supabase.auth.admin.createUser({
       email: `donor_${Date.now()}@test.com`,
       password: 'password123',
       email_confirm: true
    });
    const userId = authData.user.id;

    // 1b. Create Donator Profile
    console.log("   Creating Donator Profile...");
    const { data: profileRes, error: profErr } = await supabase.functions.invoke('manage_campaign', {
        body: {
            action: 'CREATE_DONATOR',
            user_id: userId,
            name: "Generous Tester",
            bio: "I test things."
        }
    });
    
    if (profErr) {
        console.error("   ❌ Failed to create profile:", profErr);
        return;
    }
    // usage: donator_id in donations table.
    // If table uses user_id as FK, fine. If separate ID, assume profileRes.id
    const donatorId = profileRes.id || userId; 

    // 2. Mock 'ADD_DONATION' call (Currency: VOUCHER to skip chain verify)
    console.log("   Invoking manage_campaign (ADD_DONATION)...");
    const { data: donRes, error: donErr } = await supabase.functions.invoke('manage_campaign', {
        body: {
            action: 'ADD_DONATION',
            campaign_id: campData.id,
            donator_id: donatorId,
            amount: DONATION_AMOUNT,
            currency: 'VOUCHERS',
            tx_hash: null
        }
    });

    if (donErr) {
        console.error("   ❌ Donation Function Failed (Status):", donErr.context?.status);
        try {
            const errBody = await donErr.context?.json();
            console.error("      Error Body:", errBody);
        } catch (e) {
            console.error("      Could not read error body:", e);
        }
    } else {
        // 3. Verify
        if (donRes.newPool === initialPool + DONATION_AMOUNT) {
            console.log(`   ✅ Success: Pool updated from ${initialPool} to ${donRes.newPool}`);
        } else {
            console.error(`   ❌ Pool mismatch: Expected ${initialPool + DONATION_AMOUNT}, got ${donRes.newPool}`);
        }
        
        // Check table
        const { data: dbDon } = await supabase.from('donations').select('*').eq('id', donRes.donation.id).single();
        if (dbDon) console.log("   ✅ Donation record found in DB");
    }


    /* ---------------------------------------------------------
       PART 2: REWARDS CLAIMING (On-Chain)
       --------------------------------------------------------- */
    console.log("\n⛓️  Testing Rewards Claiming (On-Chain)...");

    const abiBountyFi = [
        "function createCampaign(uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold) external",
        "function campaigns(uint256) external view returns (uint8, uint256, uint256, uint256, uint256, bool)",
        "function submit(uint256 _campaignId, bytes32 _submissionHash) external",
        "function submitAIScore(uint256 _submissionId, uint256 _confidence) external",
        "function finalizeSubmission(uint256 _submissionId, address _recipient) external",
        "function submissions(uint256) external view returns (uint256, address, bytes32, uint8, uint256, uint256, uint256, uint256)",
        "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)",
        "event CampaignCreated(uint256 indexed campaignId, uint8 campaignType, uint256 rewardAmount)"
    ];
    const abiToken = [
        "function balanceOf(address) view returns (uint256)"
    ];

    const contract = new ethers.Contract(BOUNTYFI_ADDRESS, abiBountyFi, wrapperWallet);
    const tokenContract = new ethers.Contract(BOUNTY_TOKEN_ADDRESS, abiToken, provider);

    // 1. Create Funded Campaign (Reward = 5 Tokens)
    console.log("   Creating Funded Campaign...");
    const rewardAmount = ethers.parseEther("5"); // 5 Tokens
    let fundedCampId;
    
    // Check if we are Campaign Manager
    // wrapperWallet is deployer? If so yes.
    // If not, we might fail. Assuming yes for test env.
    
    try {
        const txCamp = await contract.createCampaign(0, rewardAmount, 0, 100, 80);
        const receipt = await txCamp.wait();
        const log = receipt.logs.find(l => {
             try { return contract.interface.parseLog(l).name === 'CampaignCreated'; } catch { return false; }
        });
        fundedCampId = contract.interface.parseLog(log).args.campaignId;
        console.log(`   ✅ Campaign Created: ID ${fundedCampId} (Reward: 5)`);
        
        // Debug Active State
        const campStruct = await contract.campaigns(fundedCampId);
        console.log(`      On-Chain Active State: ${campStruct[5]}`);
        
    } catch (e) {
        console.error("   ❌ Failed to create campaign:", e);
        return;
    }

    // 2. Create Submission
    const submissionHash = ethers.hexlify(ethers.randomBytes(32));
    
    // Submit
    let onChainId;
    try {
        const tx = await contract.submit(fundedCampId, submissionHash);
        const receipt = await tx.wait();
        const log = receipt.logs.find(l => {
             try { return contract.interface.parseLog(l).name === 'SubmissionCreated'; } catch { return false; }
        });
        onChainId = contract.interface.parseLog(log).args.submissionId;
        console.log(`   ✅ Submission Created: ID ${onChainId}`);
    } catch (e) {
        console.error("   ❌ Submit failed:", e); return;
    }

    // 3. Oracle -> High Confidence (95) -> APPROVED DIRECTLY
    console.log("   🤖 Oracle verifying (Force 95 Confidence -> APPROVED)...");
    try {
        const txScore = await contract.submitAIScore(onChainId, 95);
        await txScore.wait();
        console.log("      ✅ Score Submitted");
    } catch (e) {
        console.error("   ❌ submitAIScore failed:", e); return;
    }

    // Verify Status is APPROVED (3)
    // Enum: PENDING(0), AI_VERIFIED(1), JURY_VOTING(2), REJECTED(3), APPROVED(4) ??
    // Let's check BountyFi.sol Enum again:
    // PENDING, AI_VERIFIED, JURY_VOTING, REJECTED, APPROVED
    // 0, 1, 2, 3, 4
    // Wait, let me check the file view again to be exact on indices.
    // Line 14: PENDING, AI_VERIFIED, JURY_VOTING, REJECTED, APPROVED
    // So APPROVED is 4.
    
    const subData = await contract.submissions(onChainId);
    if (subData[3] == 4n) {
        console.log("   ✅ Status is APPROVED (4)");
    } else {
        console.error(`   ❌ Status mismatch: Expected 4, got ${subData[3]}`);
        return;
    }

    // 3. Claim (Finalize)
    console.log("   💰 Finalizing & Minting Rewards...");
    const recipient = wrapperWallet.address;
    const balanceBefore = await tokenContract.balanceOf(recipient);
    console.log(`      Balance Before: ${ethers.formatEther(balanceBefore)}`);

    try {
        const txFinal = await contract.finalizeSubmission(onChainId, recipient);
        await txFinal.wait();
        console.log("      ✅ Finalize Transaction Mined");
    } catch (e) {
        console.error("   ❌ Finalize failed:", e); return;
    }

    const balanceAfter = await tokenContract.balanceOf(recipient);
    console.log(`      Balance After:  ${ethers.formatEther(balanceAfter)}`);

    if (balanceAfter > balanceBefore) {
        console.log("   ✅ Rewards Recieved!");
    } else {
        console.error("   ❌ Balance did not increase.");
    }

}

runTest();
