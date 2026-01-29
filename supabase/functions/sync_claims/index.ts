import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

const RPC_URL = "https://sepolia.base.org"
const DISTRIBUTOR_ADDR = "0x..." // User should set this in env

const DISTRIBUTOR_ABI = [
    "event Won(address indexed user, uint256 campaignId, uint256 amount, uint8 prizeType)",
    "event Lost(address indexed user, uint256 campaignId)"
]

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload = await req.json().catch(() => ({}))
        const target_tx = payload?.tx_hash

        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        const iface = new ethers.utils.Interface(DISTRIBUTOR_ABI)

        // 1. Fetch PENDING draws
        let query = supabaseClient
            .from('prize_draws')
            .select('*')
            .eq('status', 'PENDING')

        if (target_tx) {
            query = query.eq('tx_hash', target_tx)
        } else {
            query = query.limit(10)
        }

        const { data: pending, error: fetchError } = await query

        if (fetchError) throw fetchError
        if (!pending || pending.length === 0) {
            return new Response(JSON.stringify({ message: "No pending draws" }), { headers: { "Content-Type": "application/json" } })
        }

        const results = []

        for (const draw of pending) {
            try {
                const receipt = await provider.getTransactionReceipt(draw.tx_hash)

                if (!receipt) {
                    console.log(`TX ${draw.tx_hash} not found or not mined yet.`)
                    continue
                }

                if (receipt.status === 0) {
                    // Transaction Reverted
                    await supabaseClient.from('prize_draws').update({
                        status: 'FAILED',
                        error_message: 'Transaction reverted on-chain'
                    }).eq('id', draw.id)
                    results.push({ id: draw.id, status: 'FAILED' })
                    continue
                }

                // 2. Parse Logs
                let status = 'LOST'
                let amount = 0

                for (const log of receipt.logs) {
                    try {
                        const parsed = iface.parseLog(log)
                        if (parsed.name === 'Won') {
                            status = 'WON'
                            amount = Number(ethers.utils.formatEther(parsed.args.amount))
                        } else if (parsed.name === 'Lost') {
                            status = 'LOST'
                        }
                    } catch (e) {
                        // Not our event, ignore
                    }
                }

                // 3. Update DB
                await supabaseClient.from('prize_draws').update({
                    status,
                    prize_amount: amount
                }).eq('id', draw.id)

                results.push({ id: draw.id, status, amount })

            } catch (err) {
                console.error(`Error processing draw ${draw.id}:`, err)
            }
        }

        return new Response(
            JSON.stringify({ processed: results }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
