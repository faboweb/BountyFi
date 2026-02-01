import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log(`get_tasks function called: ${req.method}`)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
        return new Response(
            JSON.stringify({ error: "Server configuration error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    try {
        let validator_address;
        try {
            const body = await req.json()
            validator_address = body.validator_address
        } catch (e: any) {
            console.error("Failed to parse request body:", e.message)
            throw new Error("Invalid request body")
        }

        console.log(`Fetching tasks for validator: ${validator_address}`)

        if (!validator_address) {
            throw new Error("Missing validator_address")
        }

        // Use the RPC method to call our SQL function
        const { data, error } = await supabaseClient.rpc('get_validator_tasks_by_wallet', {
            v_wallet: validator_address
        })

        if (error) {
            console.error("RPC error:", error.message)
            throw error
        }

        console.log(`Successfully fetched ${data?.length || 0} tasks`)

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )

    } catch (error: any) {
        console.error("get_tasks function error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
