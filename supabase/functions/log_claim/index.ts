import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { tx_hash, campaign_id, user_id } = await req.json()

        if (!tx_hash || !campaign_id) {
            throw new Error("Missing required fields")
        }

        // 1. Log the transaction as PENDING
        const { data, error } = await supabaseClient
            .from('prize_draws')
            .insert({
                tx_hash,
                campaign_id,
                user_id,
                status: 'PENDING'
            })
            .select()
            .single()

        if (error) throw error

        // 2. Proactive verification trigger (Optional: could just rely on cron)
        // We could call another function here using fetch() to start a watcher
        // for better responsiveness.

        return new Response(
            JSON.stringify({ message: "Transaction logged", entry: data }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
