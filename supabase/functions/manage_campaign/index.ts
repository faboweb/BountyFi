import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log(`manage_campaign function called: ${req.method}`)

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
        let payload;
        try {
            payload = await req.json()
        } catch (e: any) {
            console.error("Failed to parse request body:", e.message)
            throw new Error("Invalid request body")
        }

        const { action, ...data } = payload
        console.log(`Action: ${action}`, data)

        if (action === 'CREATE_DONATOR') {
            const { user_id, name, logo_url, bio, website } = data
            const { data: profile, error } = await supabaseClient
                .from('donator_profiles')
                .upsert({ user_id, name, logo_url, bio, website })
                .select()
                .single()
            if (error) throw error
            return new Response(JSON.stringify(profile), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        if (action === 'CREATE_CAMPAIGN') {
            const { user_id, title, description, prize_total, min_funding_thb, requires_face_recognition, start_date, end_date, checkpoints, tx_hash, status, quest_type, prize_chest, sponsors, image_url } = data
            if (!title) throw new Error("title is required")
            const row = {
                title,
                description: description ?? null,
                image_url: image_url ?? null,
                prize_total: prize_total ?? null,
                prize_pool: prize_total ?? null,
                min_funding_thb: min_funding_thb ?? null,
                requires_face_recognition: !!requires_face_recognition,
                start_date: start_date ?? null,
                end_date: end_date ?? null,
                deadline: end_date ?? null,
                checkpoints: checkpoints ?? null,
                status: status || 'pending_onchain',
                donator_id: user_id ?? null,
                current_pool: prize_total ?? 0,
                tx_hash: tx_hash ?? null,
                quest_type: quest_type ?? null,
                prize_chest: prize_chest ?? [],
                sponsors: sponsors ?? [],
                // Required by DB constraints
                campaign_type: 'SINGLE_PHOTO',
                reward_amount: 0,
                stake_amount: 0,
                radius_m: 50,
                ai_threshold: 80,
            }
            const { data: campaign, error } = await supabaseClient
                .from('campaigns')
                .insert(row)
                .select()
                .single()
            if (error) throw error
            return new Response(JSON.stringify(campaign), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        if (action === 'ADD_PRIZE') {
            const { campaign_id, donator_id, donator_address, metadata_hash, amount, value, eip712_metadata, label, image, sponsor } = data
            if (!campaign_id || !metadata_hash) throw new Error("campaign_id and metadata_hash are required")
            const row = {
                campaign_id,
                donator_id: donator_id ?? null,
                donator_address: donator_address ?? null,
                metadata_hash,
                amount: amount ?? 0,
                value: value ?? 0,
                eip712_metadata: eip712_metadata ?? null,
                label: label ?? null,
                image: image ?? null,
                sponsor: sponsor ?? null,
            }
            const { data: prize, error } = await supabaseClient
                .from('campaign_prizes')
                .insert(row)
                .select()
                .single()
            if (error) throw error
            return new Response(JSON.stringify(prize), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        if (action === 'CONFIRM_PRIZE') {
            const { campaign_id, metadata_hash, tx_hash } = data
            if (!campaign_id || !metadata_hash || !tx_hash) throw new Error("campaign_id, metadata_hash and tx_hash are required")
            const { data: prize, error } = await supabaseClient
                .from('campaign_prizes')
                .update({ tx_hash, updated_at: new Date().toISOString() })
                .eq('campaign_id', campaign_id)
                .eq('metadata_hash', metadata_hash)
                .is('tx_hash', null)
                .select()
                .maybeSingle()
            if (error) throw error
            return new Response(JSON.stringify(prize ?? { updated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }



        throw new Error("Invalid action")

    } catch (error: any) {
        console.error("manage_campaign function error:", error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
