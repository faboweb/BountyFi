import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { validator_id } = await req.json()

        if (!validator_id) {
            throw new Error("Missing validator_id")
        }

        // Use the RPC method to call our SQL function
        const { data, error } = await supabaseClient.rpc('get_validator_tasks', {
            v_id: validator_id
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
