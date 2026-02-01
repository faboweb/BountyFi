import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { validator_address } = await req.json()

        if (!validator_address) {
            throw new Error("Missing validator_address")
        }

        // Use the RPC method to call our SQL function
        const { data, error } = await supabaseClient.rpc('get_validator_tasks_by_wallet', {
            v_wallet: validator_address
        })

        if (error) throw error

        return new Response(
            JSON.stringify(data),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
