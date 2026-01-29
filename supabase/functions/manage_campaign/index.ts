import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload = await req.json()
        const { action, ...data } = payload

        if (action === 'CREATE_DONATOR') {
            const { user_id, name, logo_url, bio, website } = data
            const { data: profile, error } = await supabaseClient
                .from('donator_profiles')
                .upsert({ user_id, name, logo_url, bio, website })
                .select()
                .single()
            if (error) throw error
            return new Response(JSON.stringify(profile), { headers: { "Content-Type": "application/json" } })
        }

        if (action === 'ADD_DONATION') {
            const { campaign_id, donator_id, amount, currency, tx_hash } = data

            // 0. Optional: Verify TX on-chain if hash provided
            if (tx_hash && currency === 'ETH') {
                const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org")
                const receipt = await provider.getTransactionReceipt(tx_hash)
                if (receipt && receipt.status === 0) {
                    throw new Error("Transaction reverted on-chain")
                }
            }

            // 1. Record Donation
            const { data: donation, error: donationError } = await supabaseClient
                .from('donations')
                .insert({ campaign_id, donator_id, amount, currency, tx_hash })
                .select()
                .single()
            if (donationError) throw donationError

            // 2. Update Campaign Pool
            const { data: campaign, error: fetchError } = await supabaseClient
                .from('campaigns')
                .select('current_pool')
                .eq('id', campaign_id)
                .single()
            if (fetchError) throw fetchError

            const newPool = (Number(campaign.current_pool) || 0) + Number(amount)

            const { error: updateError } = await supabaseClient
                .from('campaigns')
                .update({ current_pool: newPool })
                .eq('id', campaign_id)
            if (updateError) throw updateError

            return new Response(JSON.stringify({ donation, newPool }), { headers: { "Content-Type": "application/json" } })
        }

        throw new Error("Invalid action")

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
