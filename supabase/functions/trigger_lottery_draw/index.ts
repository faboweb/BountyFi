import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

const PRIV_KEY = Deno.env.get('PRIVATE_KEY')!
const RPC_URL = "https://sepolia.base.org"

// Lottery Contract (Base Sepolia) - Deployed at nonce 15 (v2.5)
const LOTTERY_ADDR = "0x7c66791F28EfA179667DBba50C65DaaF8dd04d53"

const LOTTERY_ABI = [
    "function requestDraw(uint256 campaignId, address[] participants, uint256[] ticketCounts) external",
    "event DrawRequested(uint256 indexed requestId, uint256 campaignId)"
]

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { campaign_id } = await req.json()

        if (!campaign_id) {
            throw new Error("Missing campaign_id")
        }

        // 1. Fetch all tickets for this campaign
        // We join with 'users' to get wallet_address
        const { data: tickets, error } = await supabaseClient
            .from('tickets')
            .select('amount, user:users!tickets_user_id_fkey(wallet_address)')
            .eq('campaign_id', campaign_id)

        if (error) throw error
        if (!tickets || tickets.length === 0) {
            return new Response(JSON.stringify({ message: "No tickets found for this campaign" }), {
                headers: { "Content-Type": "application/json" },
            })
        }

        // 2. Aggregate Tickets per User (Wallet)
        const aggregator: Record<string, number> = {}

        for (const t of tickets) {
            const wallet = t.user?.wallet_address
            if (wallet) {
                aggregator[wallet] = (aggregator[wallet] || 0) + t.amount
            }
        }

        const participants = Object.keys(aggregator)
        const ticketCounts = Object.values(aggregator)

        if (participants.length === 0) {
            throw new Error("No valid participants with wallets found")
        }

        console.log(`Starting draw for Campaign ${campaign_id} with ${participants.length} participants...`)

        // 3. Call Lottery Contract
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        const wallet = new ethers.Wallet(PRIV_KEY, provider)
        const lotteryContract = new ethers.Contract(LOTTERY_ADDR, LOTTERY_ABI, wallet)

        // Convert UUID to uint256 for contract call
        const campaignIdUint = ethers.BigNumber.from("0x" + campaign_id.replace(/-/g, ""))

        // Gas estimation can be tricky, we'll use a manual limit or let it flow
        const tx = await lotteryContract.requestDraw(campaignIdUint, participants, ticketCounts)
        console.log(`Draw Requested TX: ${tx.hash}`)

        const receipt = await tx.wait()

        // 4. Update Campaign Status
        // We assume success if tx didn't revert
        await supabaseClient
            .from('campaigns')
            .update({
                status: 'DRAW_PENDING',
                draw_requested_at: new Date().toISOString()
            })
            .eq('id', campaign_id)

        return new Response(
            JSON.stringify({
                message: "Draw requested successfully",
                txHash: receipt.transactionHash,
                participants: participants.length
            }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
