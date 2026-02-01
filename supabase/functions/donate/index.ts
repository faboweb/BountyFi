import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error("Missing Supabase configuration")
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
        const {
            campaign_id,
            donator_id,
            donator_address,
            amount,
            currency,
            tx_hash,
            message,
            type,
            details,
            company_name,
            image_url,
            quantity
        } = await req.json()

        if (!campaign_id || !amount) {
            throw new Error("Missing required fields: campaign_id, amount")
        }

        // Optional: Verify TX on-chain if hash provided (same logic as before)
        if (tx_hash && (currency === 'ETH' || currency === 'USDC')) {
            const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org")
            const receipt = await provider.getTransactionReceipt(tx_hash)
            if (receipt && receipt.status === 0) {
                throw new Error("Transaction reverted on-chain")
            }
        }

        // Insert donation
        const { data: donation, error } = await supabase
            .from('donations')
            .insert({
                campaign_id,
                donator_id,
                amount,
                currency: currency || 'USDC',
                tx_hash,
                message,
                donation_type: type,
                details,
                company_name,
                donator_address,
                image_url,
                quantity: quantity || 1
            })
            .select()
            .single()

        if (error) throw error

        return new Response(JSON.stringify(donation), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})
