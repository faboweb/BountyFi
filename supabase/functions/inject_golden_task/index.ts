import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.11.1"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const privateKey = Deno.env.get('PRIVATE_KEY')!;
const rpcUrl = Deno.env.get('RPC_URL')!;
const contractAddress = Deno.env.get('BOUNTYFI_ADDRESS')!;

// Mock Data Sets
const VALID_PHOTOS = [
    "https://example.com/valid_dog_1.jpg",
    "https://example.com/valid_park_2.jpg"
];
const INVALID_PHOTOS = [
    "https://example.com/invalid_cat.jpg", // Wrong object
    "https://example.com/invalid_dark.jpg" // Bad quality
];

const VALID_LOCS = [
    { lat: 40.7128, lng: -74.0060 }, // NYC
    { lat: 51.5074, lng: -0.1278 }   // London
];
const INVALID_LOCS = [
    { lat: 0, lng: 0 },              // Null Island
    { lat: -90, lng: 0 }             // South Pole
];

serve(async (req) => {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddress, ["function submit(uint256, bytes32) external"], wallet);

        // 1. Randomize Scenario
        const isApprove = Math.random() > 0.5; // 50/50 split
        const expectedOutcome = isApprove ? 'APPROVE' : 'REJECT';

        // Validation Logic Flaws
        // To make a task 'REJECT', we need to fail one of the checks validators look for.
        // For minimal MVP, let's say 'REJECT' means 'Wrong Photo'.
        // We could also mix 'Wrong Location' but that's harder to visualize for humans without a map.

        const photoUrl = isApprove
            ? VALID_PHOTOS[Math.floor(Math.random() * VALID_PHOTOS.length)]
            : INVALID_PHOTOS[Math.floor(Math.random() * INVALID_PHOTOS.length)];

        const loc = isApprove
            ? VALID_LOCS[Math.floor(Math.random() * VALID_LOCS.length)]
            // If we want to test location failure, use invalid loc. 
            // But let's stick to Photo Content for now as primary 'human' check.
            : VALID_LOCS[Math.floor(Math.random() * VALID_LOCS.length)];

        const campaignId = 1; // Needs to be an active campaign ID. Ideally fetch one?

        // Fetch a valid active campaign to attach to
        const { data: campaign } = await supabase
            .from('campaigns')
            .select('id')
            .eq('active', true)
            .limit(1)
            .single();

        const targetCampaignId = campaign ? campaign.id : 1;

        console.log(`Injecting Golden Task: ${expectedOutcome} for Campaign ${targetCampaignId}`);

        // 2. Hash Construction
        // We must mimic how real clients hash data so validators (who verify hashes optionally) see it as valid format
        // client: keccak256(abi.encode(campaignId, [urls], lat, lng)) usually? 
        // Wait, current BountyFi.sol `submit` takes `campaignId` and `bytes32 hash`.
        // The Hash content isn't strictly enforced on-chain, but off-chain validators need to verify it matches the implementation plan.

        const abiCoder = new ethers.AbiCoder();
        // Assuming hash format: keccak256(abi.encode(photoUrl, lat, lng)) - simplified
        // Or if we follow the script:
        // ["uint256", "string[]", "int256", "int256"]
        // Let's stick to a string for simplicity in this demo or match the script exactly.
        // Script used: campaignId, photoUrls (array), lat (int?), lng (int?)
        // JS nums are float. Script used ints logic?
        // Let's just use a random hash for now. The "Data" is what matters for the db.
        // The validator UI shows the DB data. The hash is for "proof".

        const submissionHash = ethers.hexlify(ethers.randomBytes(32));

        // 3. Submit to Chain
        const tx = await contract.submit(targetCampaignId, submissionHash);
        console.log("Tx Chain:", tx.hash);
        const receipt = await tx.wait();

        // Extract ID
        // Note: parsing logs in Edge Function can be flaky if RPC is slow or logs not indexed immediately.
        // Alternative: Use static ID? No, chain increments it.
        // We parse the log.
        const subLog = receipt.logs.find((l: any) => l.topics[0] === ethers.id("SubmissionCreated(uint256,uint256,address,bytes32)"));
        const parsedLog = contract.interface.parseLog(subLog);
        const onchainId = parsedLog.args[0].toString();

        // 4. Insert to DB (Public Submission)
        const { data: submission, error: subError } = await supabase
            .from('submissions')
            .insert({
                campaign_id: targetCampaignId,
                photo_url: photoUrl,
                photo_hash: submissionHash,
                lat: loc.lat,
                lng: loc.lng,
                onchain_id: onchainId,
                submitter_address: await wallet.getAddress(),
                status: 'JURY_VOTING',
                ai_confidence: 50,
                // Removed is_golden, expected_outcome from public table
                signature: 'GOLDEN_TASK_AGENT'
            })
            .select()
            .single();

        if (subError) throw subError;

        // 5. Insert to Private Golden Table
        const { error: goldenError } = await supabase
            .from('golden_tasks')
            .insert({
                submission_id: submission.id,
                expected_outcome: expectedOutcome,
                golden_content: { note: "Agent injected" }
            });

        if (goldenError) {
            // Rollback? Hard with HTTP. Just log error.
            console.error("Failed to insert golden metadata:", goldenError);
        }

        return new Response(
            JSON.stringify({ success: true, task: submission }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (e) {
        console.error(e)
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
