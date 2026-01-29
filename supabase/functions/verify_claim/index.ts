import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { draw_id, redemption_code, merchant_id } = await req.json()

        if (!draw_id || !redemption_code) {
            throw new Error("Missing redemption details")
        }

        // 1. Fetch the draw
        const { data: draw, error: fetchError } = await supabaseClient
            .from('prize_draws')
            .select('*')
            .eq('id', draw_id)
            .single()

        if (fetchError || !draw) throw new Error("Prize not found")

        // 2. Validate
        if (draw.redemption_code !== redemption_code) {
            throw new Error("Invalid redemption code")
        }

        if (draw.redeemed_at) {
            throw new Error(`Already redeemed at ${new Date(draw.redeemed_at).toLocaleString()}`)
        }

        if (draw.status !== 'WON') {
            throw new Error("This transaction was not a winning draw")
        }

        // 3. Update as redeemed
        const { error: updateError } = await supabaseClient
            .from('prize_draws')
            .update({
                redeemed_at: new Date().toISOString(),
                merchant_id: merchant_id || null
            })
            .eq('id', draw_id)

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({
                message: "Redemption successful!",
                prize_details: draw.prize_amount ? `${draw.prize_amount} ETH` : "Item/Voucher"
            }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
        )
    }
})
