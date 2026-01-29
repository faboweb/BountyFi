import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { access_token } = await req.json()

        if (!access_token) {
            throw new Error("Missing access_token")
        }

        // 1. Verify token with Coinbase API
        const coinbaseResp = await fetch("https://api.coinbase.com/v2/user", {
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "CB-VERSION": "2021-11-15"
            }
        })

        if (!coinbaseResp.ok) {
            const errBody = await coinbaseResp.text()
            throw new Error(`Coinbase Verification Failed: ${errBody}`)
        }

        const { data: cbUser } = await coinbaseResp.json()

        // We use the Coinbase User ID as a stable identifier
        const cbUserId = cbUser.id
        const email = cbUser.email

        // 3. Find or Create User
        // First check if a user with this coinbase_id exists
        let { data: existingUser, error: fetchError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('coinbase_id', cbUserId)
            .maybeSingle()

        if (fetchError) throw fetchError

        let finalUser = existingUser

        if (!existingUser) {
            // If the user doesn't exist, we need to create a record.
            // Since id references auth.users(id), we'll try to find a Supabase user with the same email
            // OR create a placeholder one if that's the project's strategy.
            // For this MVP, we will upsert into users with a generated UUID if allowed, 
            // but usually we'd use the Supabase Auth API to create a user first.

            // Checking if a user with this email already has a Supabase Auth entry
            const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
                email: email,
                email_confirm: true,
                user_metadata: { coinbase_id: cbUserId }
            })

            // If user already exists in auth, find them
            let supabaseId = authUser?.user?.id
            if (authError && authError.message.includes("already registered")) {
                const { data: usersByEmail } = await supabaseClient.auth.admin.listUsers()
                supabaseId = usersByEmail.users?.find((u: any) => u.email === email)?.id
            }

            if (!supabaseId) throw new Error("Could not create/find Supabase Auth user")

            const { data: newUser, error: upsertError } = await supabaseClient
                .from('users')
                .upsert({
                    id: supabaseId,
                    coinbase_id: cbUserId,
                    email: email,
                    wallet_address: cbUser.wallet_address // If provided
                })
                .select()
                .single()

            if (upsertError) throw upsertError
            finalUser = newUser
        }

        return new Response(
            JSON.stringify({
                message: "Verification successful",
                session: {
                    user_id: finalUser.id,
                    coinbase_id: cbUserId,
                    profile: cbUser
                }
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
