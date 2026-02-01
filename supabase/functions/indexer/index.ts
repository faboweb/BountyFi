import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.13.2"

const RPC_URL = Deno.env.get('RPC_URL')
const BOUNTYFI_ADDRESS = Deno.env.get('BOUNTYFI_ADDRESS')
const LOOTBOX_ADDRESS = Deno.env.get('LOOTBOX_ADDRESS')

const MONTHLY_CAMPAIGN_ID = 2n ** 256n - 1n // type(uint256).max

const BOUNTYFI_ABI = [
    "event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter)",
    "event CampaignCreated(uint256 indexed campaignId, string title, uint8 campaignType, uint256 rewardAmount, uint256 prizeCount)",
    "function submissions(uint256) view returns (uint256 campaignId, address submitter, string photoUrl, bytes32 photoHash, int256 lat, int256 lng, uint8 status, uint256 aiConfidence, uint256 approveVotes, uint256 rejectVotes, uint256 createdAt)",
    "function campaigns(uint256) view returns (string title, uint8 campaignType, uint256 rewardAmount, uint256 stakeAmount, uint256 radiusM, uint256 aiThreshold, bool active)",
    "function getCampaignPrizes(uint256 _campaignId) view returns (tuple(string label, string image, string sponsor, bytes32 metadataHash, uint256 amount, uint256 value)[])"
]

const LOOTBOX_ABI = [
    "function requests(uint256) view returns (address user, uint256 campaignId, bool fulfilled, uint256 prizeTier)"
]

const MONTHLY_TIER_LABELS: Record<number, string> = { 1: "Common", 2: "Uncommon", 3: "Rare" }

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const body = await req.json()
        const { event } = body
        const eventData = body

        if (!RPC_URL || !BOUNTYFI_ADDRESS) throw new Error("Missing Chain Config")
        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const contract = new ethers.Contract(BOUNTYFI_ADDRESS, BOUNTYFI_ABI, provider)

        if (event === "sync_campaign") {
            const { campaignId, transactionHash } = eventData
            console.log(`[indexer] Syncing campaign ${campaignId}, tx: ${transactionHash}`)
            
            const camp = await contract.campaigns(campaignId)
            console.log(`[indexer] Campaign data from chain:`, camp)

            // Get sender from transaction
            const tx = await provider.getTransaction(transactionHash)
            const sender = tx?.from
            console.log(`[indexer] Transaction sender: ${sender}`)

            let userId = null
            if (sender) {
                const { data: user } = await supabaseClient
                    .from('users')
                    .select('id')
                    .eq('wallet_address', sender)
                    .single()
                userId = user?.id
                console.log(`[indexer] Found user: ${userId}`)
            }

            // Fetch prizes from contract (label, image, sponsor, metadataHash, amount, value)
            let prizeChest: { label: string; image?: string; sponsor?: string; metadataHash?: string; amount?: string; value?: string }[] = []
            try {
                const prizes = await contract.getCampaignPrizes(campaignId)
                prizeChest = prizes.map((p: any) => ({
                    label: p.label,
                    ...(p.image && { image: p.image }),
                    ...(p.sponsor && { sponsor: p.sponsor }),
                    ...(p.metadataHash && p.metadataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && { metadataHash: p.metadataHash }),
                    ...(p.amount != null && { amount: p.amount.toString() }),
                    ...(p.value != null && { value: p.value.toString() }),
                }))
                console.log(`[indexer] Prizes:`, prizeChest)
            } catch (e) {
                console.warn('[indexer] Failed to fetch prizes:', e)
            }

            // Find matching pending row by tx_hash, userOpHash (stored in tx_hash column), or fallback to donator_id
            let pending = null
            
            // Try matching by exact tx_hash first
            if (transactionHash) {
                const { data: pendingByTx } = await supabaseClient
                    .from('campaigns')
                    .select('*')
                    .eq('tx_hash', transactionHash)
                    .eq('status', 'pending_onchain')
                    .maybeSingle()
                pending = pendingByTx
                console.log(`[indexer] Found pending by tx_hash:`, pending?.id)
            }

            // Fallback: find any pending campaign for this user (most recent)
            if (!pending && userId) {
                const { data: pendingByUser } = await supabaseClient
                    .from('campaigns')
                    .select('*')
                    .eq('status', 'pending_onchain')
                    .eq('donator_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                pending = pendingByUser
                console.log(`[indexer] Found pending by user:`, pending?.id)
            }

            // Update the tx_hash to the real transaction hash if we found a pending record
            if (pending && transactionHash && pending.tx_hash !== transactionHash) {
                console.log(`[indexer] Updating tx_hash from ${pending.tx_hash} to ${transactionHash}`)
            }

            const types = ["SINGLE_PHOTO", "TWO_PHOTO_CHANGE", "CHECKIN_SELFIE"]

            // Only update chain-related fields, preserve off-chain metadata
            const chainPayload = {
                onchain_id: campaignId.toString(),
                campaign_type: types[camp.campaignType] || "SINGLE_PHOTO",
                reward_amount: Number(ethers.formatEther(camp.rewardAmount)),
                stake_amount: Number(ethers.formatEther(camp.stakeAmount)),
                radius_m: Number(camp.radiusM),
                ai_threshold: Number(camp.aiThreshold),
                prize_chest: prizeChest,
                status: camp.active ? 'active' : 'ended',
                donator_id: userId,
            } as any

            console.log(`[indexer] Chain payload:`, chainPayload)

            if (pending) {
                // Update existing pending record, preserve title/description/sponsors
                const { error: updateError } = await supabaseClient.from('campaigns')
                    .update(chainPayload)
                    .eq('id', pending.id)
                if (updateError) {
                    console.error('[indexer] Update error:', updateError)
                    throw updateError
                }
                console.log(`[indexer] Updated existing campaign: ${pending.id}`)
            } else {
                // Fallback: create new record with title from chain
                const newCampaign = {
                    ...chainPayload,
                    title: camp.title || `Campaign #${campaignId}`,
                }
                const { error: upsertError } = await supabaseClient.from('campaigns')
                    .upsert(newCampaign, { onConflict: 'onchain_id' })
                if (upsertError) {
                    console.error('[indexer] Upsert error:', upsertError)
                    throw upsertError
                }
                console.log(`[indexer] Created new campaign from chain`)
            }
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

        if (event === "sync_lootbox_result") {
            const { requestId } = eventData
            if (requestId == null) throw new Error("Missing requestId for sync_lootbox_result")
            if (!RPC_URL || !LOOTBOX_ADDRESS) throw new Error("Missing LOOTBOX_ADDRESS or RPC_URL")

            const provider = new ethers.JsonRpcProvider(RPC_URL)
            const lootbox = new ethers.Contract(LOOTBOX_ADDRESS, LOOTBOX_ABI, provider)
            const reqId = BigInt(String(requestId))
            const [userAddress, campaignId, fulfilled, prizeTier] = await lootbox.requests(reqId)
            const userAddr = String(userAddress).toLowerCase()
            const campaignIdBig = BigInt(campaignId)
            const tier = Number(prizeTier)

            let prizeLabel: string | null = null
            if (fulfilled) {
                if (campaignIdBig === MONTHLY_CAMPAIGN_ID) {
                    prizeLabel = MONTHLY_TIER_LABELS[tier] ?? `Tier ${tier}`
                } else {
                    if (tier === 0) prizeLabel = "No prize"
                    else {
                        const contract = new ethers.Contract(BOUNTYFI_ADDRESS, BOUNTYFI_ABI, provider)
                        const prizes = await contract.getCampaignPrizes(campaignIdBig)
                        const idx = tier - 1
                        if (prizes[idx]) prizeLabel = prizes[idx].label ?? `Prize ${tier}`
                        else prizeLabel = `Prize ${tier}`
                    }
                }
            }

            let campaignUuid: string | null = null
            if (campaignIdBig !== MONTHLY_CAMPAIGN_ID) {
                const { data: camp } = await supabaseClient
                    .from('campaigns')
                    .select('id')
                    .eq('onchain_id', campaignIdBig.toString())
                    .maybeSingle()
                campaignUuid = camp?.id ?? null
            }

            const row = {
                request_id: String(requestId),
                user_address: userAddr,
                campaign_id: campaignUuid,
                onchain_campaign_id: campaignIdBig === MONTHLY_CAMPAIGN_ID ? null : campaignIdBig.toString(),
                prize_tier: tier,
                prize_label: prizeLabel,
                fulfilled: Boolean(fulfilled),
                updated_at: new Date().toISOString(),
            }
            const { error: upsertErr } = await supabaseClient.from('lootbox_opens')
                .upsert(row, { onConflict: 'request_id', ignoreDuplicates: false })
            if (upsertErr) throw upsertErr
            console.log('[indexer] sync_lootbox_result:', requestId, prizeLabel)
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
