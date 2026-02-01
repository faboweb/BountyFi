import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { wallet_address, email } = await req.json()

        if (!wallet_address || typeof wallet_address !== 'string') {
            throw new Error("Missing wallet_address")
        }

        const wallet = String(wallet_address).trim()

        const { data: existingUser, error: fetchError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('wallet_address', wallet)
            .maybeSingle()

        if (fetchError) throw fetchError

        if (existingUser) {
            return new Response(
                JSON.stringify({ user: existingUser }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const placeholderEmail = (email && String(email).trim()) || `${wallet.toLowerCase()}@wallet.bountyfi.app`

        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
            email: placeholderEmail,
            email_confirm: true,
            user_metadata: { wallet_address: wallet },
        })

        let supabaseId = authUser?.user?.id
        if (authError && (authError.message.includes("already registered") || authError.message.includes("already exists"))) {
            const { data: list } = await supabaseClient.auth.admin.listUsers({ perPage: 1000 })
            supabaseId = list?.users?.find((u: any) => u.email === placeholderEmail)?.id ?? null
        }

        if (!supabaseId) throw new Error("Could not create or find auth user")

        const { data: newUser, error: insertError } = await supabaseClient
            .from('users')
            .insert({
                id: supabaseId,
                wallet_address: wallet,
                email: placeholderEmail,
            })
            .select()
            .single()

        if (insertError) throw insertError

        return new Response(
            JSON.stringify({ user: newUser }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        console.error("[ensure_user]", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
