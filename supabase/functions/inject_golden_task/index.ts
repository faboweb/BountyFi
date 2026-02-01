import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.11.1"

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const privateKey = Deno.env.get('PRIVATE_KEY');
const rpcUrl = Deno.env.get('RPC_URL');
const contractAddress = Deno.env.get('BOUNTYFI_ADDRESS');

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
        if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({ success: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), { headers: { "Content-Type": "application/json" } });
        }
        if (!rpcUrl || !privateKey || !contractAddress) {
            return new Response(JSON.stringify({ success: false, error: "Missing RPC_URL, PRIVATE_KEY, or BOUNTYFI_ADDRESS" }), { headers: { "Content-Type": "application/json" } });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        const abi = [
            "function submit(uint256, bytes32) external",
            "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)"
        ];
        const contract = new ethers.Contract(contractAddress, abi, wallet);

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
            : VALID_LOCS[Math.floor(Math.random() * VALID_LOCS.length)]; // Use valid locs for now

        // Fetch a valid active campaign from DB, fallback to 0 (known active on chain)
        let targetCampaignId = 0;
        let campaignId: string | null = null;
        let campaign = null;
        const { data: camp1, error: campErr } = await supabase
            .from('campaigns')
            .select('id, onchain_id')
            .eq('active', true)
            .not('onchain_id', 'is', null)
            .limit(1)
            .maybeSingle();
        if (!campErr && camp1) campaign = camp1;
        if (!campaign) {
            const { data: camp2 } = await supabase
                .from('campaigns')
                .select('id, onchain_id')
                .eq('status', 'active')
                .not('onchain_id', 'is', null)
                .limit(1)
                .maybeSingle();
            campaign = camp2;
        }

        if (campErr) throw new Error(`Campaign fetch failed: ${campErr.message}`);
        if (campaign) {
            campaignId = campaign.id;
            if (campaign.onchain_id != null) targetCampaignId = campaign.onchain_id;
        }

        if (!campaignId) throw new Error("No campaign with onchain_id found. Create and sync a campaign first.");

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
        let tx: { hash?: string; wait: () => Promise<any> };
        try {
            tx = await contract.submit(targetCampaignId, submissionHash);
        } catch (chainErr: any) {
            throw new Error(`Chain submit failed: ${chainErr?.message || chainErr}`);
        }
        if (!tx || typeof tx.wait !== 'function') throw new Error("Submit failed: no transaction returned");
        console.log("Tx Chain:", tx.hash);
        let receipt: any;
        try {
            receipt = await tx.wait();
        } catch (waitErr: any) {
            throw new Error(`Tx wait failed: ${waitErr?.message || waitErr}`);
        }
        if (!receipt || !receipt.logs) throw new Error("Transaction receipt missing logs");

        // Extract ID
        // Note: parsing logs in Edge Function can be flaky if RPC is slow or logs not indexed immediately.
        // Alternative: Use static ID? No, chain increments it.
        // We parse the log.
        const subLog = receipt.logs.find((l: any) => {
            try { return contract.interface.parseLog(l).name === 'SubmissionCreated'; } catch { return false; }
        });

        let onchainId = "0";
        if (subLog) {
            onchainId = contract.interface.parseLog(subLog).args.submissionId.toString();
        } else {
            throw new Error("Could not parse SubmissionCreated event");
        }

        // 4. Insert to DB (Public Submission)
        const { data: submission, error: subError } = await supabase
            .from('submissions')
            .insert({
                campaign_id: campaignId,
                // Wait, if we used 0 (chain ID), we need the corresponding DB UUID.
                // The DB schema likely requires a UUID campaign_id.
                // If we don't have one, we might fail constraint.
                // Let's rely on finding one in DB. If not, we can't really insert into DB properly without a campaign record.
                photo_url: photoUrl,
                photo_hash: submissionHash,
                gps_lat: loc.lat,
                gps_lng: loc.lng,
                onchain_id: parseInt(onchainId),
                submitter_address: await wallet.getAddress(),
                status: 'JURY_VOTING', // Golden tasks start in Voting? Or Pending?
                // If they are golden, they are meant for validators. Validators verify PENDING or JURY?
                // Usually JURY_VOTING.
                ai_confidence: 50,
                // Indistinguishable from relay submissions: use opaque hex (same format as EIP-712 sig)
                // so validators cannot guess golden vs regular when all go through the agent.
                signature: ethers.hexlify(ethers.randomBytes(65))
            })
            .select()
            .single();

        if (subError) throw new Error(`DB Insert Error: ${subError.message} (${subError.details})`);

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
            JSON.stringify({ success: false, error: e.message, stack: e.stack }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        )
    }
})
