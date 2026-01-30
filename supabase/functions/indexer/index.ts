import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.13.2"

const RPC_URL = Deno.env.get('RPC_URL')
const BOUNTYFI_ADDRESS = Deno.env.get('BOUNTYFI_ADDRESS')

const BOUNTYFI_ABI = [
    "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter)",
    "function submissions(uint256) view returns (uint256 campaignId, address submitter, string photoUrl, bytes32 photoHash, int256 lat, int256 lng, uint8 status, uint256 aiConfidence, uint256 approveVotes, uint256 rejectVotes, uint256 createdAt)",
    "function campaigns(uint256) view returns (uint8 campaignType, uint256 rewardAmount, uint256 stakeAmount, uint256 radiusM, uint256 aiThreshold, bool active)"
]

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { event } = await req.json() // Triggered by a log watcher or manual sync

        if (!RPC_URL || !BOUNTYFI_ADDRESS) throw new Error("Missing Chain Config")
        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const contract = new ethers.Contract(BOUNTYFI_ADDRESS, BOUNTYFI_ABI, provider)

        if (event === "sync_campaigns") {
            // Logic to sync all active campaigns
            // ...
        }

        if (event === "sync_submission") {
            const { submissionId } = await req.json()
            const sub = await contract.submissions(submissionId)

            // Map status enum to string
            const statuses = ["PENDING", "AI_VERIFIED", "JURY_VOTING", "REJECTED", "APPROVED"]

            // Try to find existing submission by photo_hash (created by verify_submission)
            const { data: existing } = await supabaseClient
                .from('submissions')
                .select('id')
                .eq('photo_hash', sub.photoHash) // Assumes photoHash is unique per submission or valid key
                .single()

            const payload = {
                onchain_id: Number(submissionId),
                campaign_id: Number(sub.campaignId),
                submitter_address: sub.submitter,
                photo_url: sub.photoUrl,
                photo_hash: sub.photoHash,
                lat: Number(sub.lat),
                lng: Number(sub.lng),
                // Only update status if logic dictates (e.g. if chain status advanced beyond DB)
                // For now, we sync basics.
                ai_confidence: Number(sub.aiConfidence),
                approve_votes: Number(sub.approveVotes),
                reject_votes: Number(sub.rejectVotes),
                // created_at: ... // Don't overwrite created_at of draft
            } as any;

            // If chain Status is NOT Pending, sync it (source of truth)
            if (sub.status > 0) {
                payload.status = statuses[sub.status] || "UNKNOWN";
            }

            if (existing) {
                // Update existing
                await supabaseClient.from('submissions').update(payload).eq('id', existing.id);
            } else {
                // Insert new (direct contract interaction)
                payload.created_at = new Date(Number(sub.createdAt) * 1000).toISOString();
                payload.status = statuses[sub.status] || "PENDING"; // Default if new
                await supabaseClient.from('submissions').insert(payload);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
        })
    }
})
