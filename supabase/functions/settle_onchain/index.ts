import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

const PRIV_KEY = Deno.env.get('PRIVATE_KEY')!
const RPC_URL = "https://sepolia.base.org"

// Contract Addresses (Base Sepolia)
const ANCHOR_ADDR = "0xDff7549e227A5A76A58CBC3002B4DE17b88c5AD5"
const TICKETS_ADDR = "0x86496462F13a60Bf271167aC7183Ec6e1C30BCC9"

const ANCHOR_ABI = [
    "function anchor(bytes32 submissionHash) external",
    "function anchored(bytes32) view returns (bool)"
]
const TICKETS_ABI = [
    "function mint(address user, uint256 campaignId, uint256 amount, bytes32 submissionHash) external",
    "function mintReward(address user, uint256 campaignId, uint256 amount, bytes32 rewardHash) external"
]

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload = await req.json()
        const target_id = payload?.submission_id

        // 1. Fetch Approved Submissions that aren't settled yet
        let query = supabase
            .from('submissions')
            .select('*, campaign:campaigns(*), user:users!submissions_user_id_fkey(wallet_address, facilitator_id, facilitator_pending_tickets)')
            .eq('status', 'APPROVED')
            .is('onchain_tx', null) // Avoid double settling

        if (target_id) query = query.eq('id', target_id)
        else query = query.limit(5)

        const { data: submissions, error } = await query
        if (error) throw error
        if (!submissions || submissions.length === 0) {
            return new Response(JSON.stringify({ message: "No approved submissions to settle" }), { headers: { 'Content-Type': 'application/json' } })
        }

        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        const wallet = new ethers.Wallet(PRIV_KEY, provider)
        const anchorContract = new ethers.Contract(ANCHOR_ADDR, ANCHOR_ABI, wallet)
        const ticketsContract = new ethers.Contract(TICKETS_ADDR, TICKETS_ABI, wallet)

        const results = []

        for (const sub of submissions) {
            if (!sub.user?.wallet_address) {
                console.error(`User for submission ${sub.id} has no wallet.`)
                continue
            }

            console.log(`Settling submission ${sub.id} for ${sub.user.wallet_address}...`)

            // 2. Compute Hash
            // hash(id, userAddr, campaignId, timestamp)
            const submissionHash = ethers.utils.solidityKeccak256(
                ['string', 'address', 'string', 'uint256'],
                [sub.id, sub.user.wallet_address, sub.campaign_id, Math.floor(new Date(sub.created_at).getTime() / 1000)]
            )

            // 3. Anchor on-chain
            // Check if already anchored to save gas (idempotency)
            const isAnchored = await anchorContract.anchored(submissionHash)
            if (!isAnchored) {
                const tx1 = await anchorContract.anchor(submissionHash)
                console.log(`Anchor TX sent: ${tx1.hash}`)
                await tx1.wait()
            }

            // 4. Check Daily Limit (1 ticket per campaign per day)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const { data: existingTicket } = await supabase.from('tickets')
                .select('id')
                .eq('user_id', sub.user_id)
                .eq('campaign_id', sub.campaign_id)
                .gte('created_at', today.toISOString())
                .limit(1)
                .single()

            if (existingTicket) {
                console.log(`User ${sub.user_id} already earned a ticket for campaign ${sub.campaign_id} today. Skipping mint.`)
                await supabase.from('submissions').update({
                    onchain_status: 'SKIPPED_DAILY_LIMIT',
                    onchain_tx: 'DAILY_LIMIT_REACHED'
                }).eq('id', sub.id)
                continue
            }

            // 5. Mint Tickets
            // Default 1 ticket per submission
            const ticketAmount = 1
            const campaignIdUint = ethers.BigNumber.from("0x" + sub.campaign_id.replace(/-/g, ""))
            const tx2 = await ticketsContract.mint(sub.user.wallet_address, campaignIdUint, ticketAmount, submissionHash)
            console.log(`Mint TX sent: ${tx2.hash}`)
            const receipt = await tx2.wait()

            // 6. Facilitator Reward Logic
            if (sub.user.facilitator_id) {
                const pending = (sub.user.facilitator_pending_tickets || 0) + ticketAmount

                if (pending >= 10) {
                    const rewardAmount = Math.floor(pending / 10)
                    const remainder = pending % 10

                    // Fetch facilitator wallet
                    const { data: facilitator } = await supabase.from('users').select('wallet_address').eq('id', sub.user.facilitator_id).single()

                    if (facilitator?.wallet_address) {
                        const rewardHash = ethers.utils.solidityKeccak256(
                            ['string', 'address', 'uint256'],
                            ['FACILITATOR_REWARD', facilitator.wallet_address, Math.floor(Date.now() / 1000)]
                        )

                        try {
                            const txReward = await ticketsContract.mintReward(facilitator.wallet_address, campaignIdUint, rewardAmount, rewardHash)
                            console.log(`Facilitator Reward Minted: ${txReward.hash}`)

                            // Log reward ticket
                            await supabase.from('tickets').insert({
                                user_id: sub.user.facilitator_id,
                                campaign_id: sub.campaign_id,
                                amount: rewardAmount,
                                source: 'facilitator_reward',
                                tx_hash: txReward.hash,
                                submission_hash: rewardHash
                            })
                        } catch (err) {
                            console.error("Facilitator mint failed:", err)
                        }
                    }

                    // Update pending count (reset)
                    await supabase.from('users').update({ facilitator_pending_tickets: remainder }).eq('id', sub.user_id)
                } else {
                    // Just increment
                    await supabase.from('users').update({ facilitator_pending_tickets: pending }).eq('id', sub.user_id)
                }
            }

            // 7. Update DB
            await supabase.from('submissions').update({
                onchain_tx: receipt.transactionHash,
                onchain_status: 'SETTLED'
            }).eq('id', sub.id)

            // Also log to tickets table
            await supabase.from('tickets').insert({
                user_id: sub.user_id,
                campaign_id: sub.campaign_id,
                amount: ticketAmount,
                source: 'submission',
                tx_hash: receipt.transactionHash,
                submission_hash: submissionHash
            })

            results.push({ id: sub.id, tx: receipt.transactionHash })
        }

        // 6. Settle Pending Validator Rewards
        const { data: pendingTickets } = await supabase
            .from('tickets')
            .select('*')
            .is('tx_hash', null)
            .eq('source', 'validator_milestone')
            .limit(5)

        if (pendingTickets && pendingTickets.length > 0) {
            console.log(`Settling ${pendingTickets.length} pending validator rewards...`)
            for (const ticket of pendingTickets) {
                const { data: user } = await supabase.from('users').select('wallet_address').eq('id', ticket.user_id).single()
                if (!user?.wallet_address) continue

                // Generate a unique hash for the milestone
                const milestoneHash = ethers.utils.solidityKeccak256(
                    ['string', 'address', 'uint256'],
                    ['VALIDATOR_MILESTONE', user.wallet_address, Math.floor(new Date(ticket.created_at).getTime() / 1000)]
                )

                // Check Daily Limit for Validator (1 ticket per campaign per day)
                const todayV = new Date()
                todayV.setHours(0, 0, 0, 0)

                const { data: existingVTicket } = await supabase.from('tickets')
                    .select('id')
                    .eq('user_id', ticket.user_id)
                    .eq('campaign_id', ticket.campaign_id)
                    .eq('tx_hash', 'DAILY_LIMIT_REACHED')
                    .gte('created_at', todayV.toISOString())
                    .limit(1)
                    .single()

                if (existingVTicket) {
                    console.log(`Validator ${ticket.user_id} already earned a ticket for campaign ${ticket.campaign_id} today.`)
                    await supabase.from('tickets').update({
                        tx_hash: 'DAILY_LIMIT_REACHED',
                        submission_hash: milestoneHash
                    }).eq('id', ticket.id)
                    continue
                }

                // Mint
                const vCampaignId = ticket.campaign_id ? ethers.BigNumber.from("0x" + ticket.campaign_id.replace(/-/g, "")) : ethers.BigNumber.from(0)
                const tx = await ticketsContract.mint(user.wallet_address, vCampaignId, ticket.amount, milestoneHash)
                console.log(`Validator Mint TX: ${tx.hash}`)
                const receipt = await tx.wait()

                // Update Ticket Record
                await supabase.from('tickets').update({
                    tx_hash: receipt.transactionHash,
                    submission_hash: milestoneHash
                }).eq('id', ticket.id)

                results.push({ type: 'validator_reward', id: ticket.id, tx: receipt.transactionHash })
            }
        }

        return new Response(JSON.stringify({ settled: results }), { headers: { 'Content-Type': 'application/json' } })

    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
