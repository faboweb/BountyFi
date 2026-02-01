import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.11.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { campaign_id, photo_urls, gps_lat, gps_lng, signature, public_address, eip712_message } = await req.json()

        if (!signature || !public_address) throw new Error("Missing signature or address")
        if (!eip712_message || !eip712_message.submissionHash || !eip712_message.recipient) throw new Error("Missing EIP-712 message (submissionHash, recipient, nonce)")

        // 1. Fetch onchain_id for this campaign
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select('onchain_id')
            .eq('id', campaign_id)
            .single();

        if (campaignError) throw new Error(`Campaign fetch failed: ${campaignError.message}`);
        const contractCampaignId = campaign?.onchain_id;
        if (contractCampaignId == null) throw new Error("Campaign not yet on chain");

        // 2. Recompute submission hash (must match client - GPS scaled by 1e6)
        const GPS_SCALE = 1e6;
        const latScaled = BigInt(Math.floor(gps_lat * GPS_SCALE));
        const lngScaled = BigInt(Math.floor(gps_lng * GPS_SCALE));
        const abiCoder = new ethers.AbiCoder();
        const submissionHash = ethers.keccak256(abiCoder.encode(
            ["uint256", "string[]", "int256", "int256"],
            [contractCampaignId, photo_urls, latScaled, lngScaled]
        ));

        if (submissionHash !== eip712_message.submissionHash) {
            throw new Error("Submission hash mismatch - data may have been tampered");
        }
        if (eip712_message.recipient.toLowerCase() !== public_address.toLowerCase()) {
            throw new Error("Recipient must match signer address");
        }

        // 3. Verify EIP-712 signature
        const domain = {
            name: "BountyFi",
            version: "1",
            chainId: 84532,
            verifyingContract: "0x0000000000000000000000000000000000000000",
        };
        const types = {
            BountyFiSubmission: [
                { name: "submissionHash", type: "bytes32" },
                { name: "recipient", type: "address" },
                { name: "nonce", type: "uint256" },
            ],
        };
        const recoveredAddress = ethers.verifyTypedData(
            domain,
            types,
            eip712_message,
            signature
        );
        if (recoveredAddress.toLowerCase() !== public_address.toLowerCase()) {
            throw new Error("Invalid EIP-712 signature");
        }

        // 4. Insert into DB (Pending state, no onchain_id yet)
        const { data: submission, error: insertError } = await supabaseClient
            .from('submissions')
            .insert({
                campaign_id,
                user_id: null,
                submitter_address: public_address,
                photo_urls,
                gps_lat,
                gps_lng,
                signature,
                submission_hash: submissionHash,
                status: 'PENDING'
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 4. Submit to Chain
        const provider = new ethers.JsonRpcProvider(Deno.env.get('RPC_URL'));
        const wallet = new ethers.Wallet(Deno.env.get('PRIVATE_KEY') ?? '', provider);
        const contract = new ethers.Contract(
            Deno.env.get('BOUNTYFI_ADDRESS') ?? '',
            [
                "function submit(uint256, bytes32) external",
                "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash)"
            ],
            wallet
        );

        const tx = await contract.submit(contractCampaignId, submissionHash);
        const receipt = await tx.wait();

        // Determine ID from events
        // Event SubmissionCreated(uint256 indexed submissionId, ...)
        // Topic[0] = hash ...
        // Using simple log parsing if needed, or assumng nextId if no concurrency? 
        // Reliable way: Parse logs.
        const subLog = receipt.logs.find((l: any) => l.topics[0] === ethers.id("SubmissionCreated(uint256,uint256,address,bytes32)"));
        const parsedLog = contract.interface.parseLog(subLog);
        const onchainId = parsedLog.args[0].toString();

        // 4. Update DB
        const { error: updateError } = await supabaseClient
            .from('submissions')
            .update({ onchain_id: onchainId })
            .eq('id', submission.id);

        if (updateError) throw updateError;

        return new Response(
            JSON.stringify({ success: true, submission_id: submission.id, onchain_id: onchainId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error: any) {
        console.error(`[RelaySubmission] Error:`, error);
        return new Response(
            JSON.stringify({
                error: error.message,
                details: error.details || error.hint || 'No additional details'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
