import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        // 1. Identify eligible validators (>= 10 validations today)
        const { data: eligibleValidators, error: fetchError } = await supabaseClient
            .from('validators')
            .select('user_id, validations_today')
            .gte('validations_today', 10)

        if (fetchError) throw fetchError

        console.log(`Found ${eligibleValidators.length} eligible validators`)

        // 2. Award Tickets
        for (const val of eligibleValidators) {
            // Create ticket record
            await supabaseClient
                .from('tickets')
                .insert({
                    user_id: val.user_id,
                    amount: 1,
                    source: 'daily_bonus_validation'
                })

            // Update stats (tickets_earned +1)
            await supabaseClient.rpc('increment_tickets', {
                x: 1,
                row_id: val.user_id
            })
            // Note: We need an RPC or direct update. For MVP direct update:
            // await supabaseClient.from('validators').update({ tickets_earned: ... }).eq...
        }

        // 3. Reset Daily Counters
        const { error: resetError } = await supabaseClient
            .from('validators')
            .update({ validations_today: 0 })
            .neq('validations_today', 0) // Only update those with values

        if (resetError) throw resetError

        return new Response(
            JSON.stringify({ message: `Processed ${eligibleValidators.length} rewards and reset counters` }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
