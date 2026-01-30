import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.11.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { signature, message } = await req.json()

        if (!signature || !message) {
            throw new Error("Missing signature or message")
        }

        // 1. Recover Signer
        const publicAddress = ethers.verifyMessage(message, signature);
        console.log(`[RelayLootbox] Recovered address: ${publicAddress}`);

        // 2. Identify User & Check Balance
        // We look for the user with this wallet address. 
        // We check the 'tickets' table or 'users' profile if it has a tickets cached count.
        // For MVP, we'll check the sum of 'amount' in 'tickets' table for that user.

        // Match user by wallet_address (assuming it's in public.users or metadata)
        // If not found, we can't proceed.
        const { data: userData, error: userError } = await supabaseClient
            .from('users') // Assuming a public 'users' table exists as per earlier research
            .select('id, tickets')
            .eq('wallet_address', publicAddress.toLowerCase())
            .maybeSingle();

        if (userError) throw userError;
        if (!userData) throw new Error(`User not found for address ${publicAddress}`);

        const currentTickets = userData.tickets ?? 0;
        if (currentTickets < 10) {
            throw new Error(`Insufficient tickets. Have ${currentTickets}, need 10.`);
        }

        // 3. Deduct Tickets in DB
        const { error: updateError } = await supabaseClient
            .from('users')
            .update({ tickets: currentTickets - 10 })
            .eq('id', userData.id);

        if (updateError) throw updateError;

        // Also log the transaction in 'tickets' table
        await supabaseClient.from('tickets').insert({
            user_id: userData.id,
            amount: -10,
            source: 'lootbox_open',
            description: 'Opened Monthly Lootbox'
        });

        // 4. Submit to Chain
        const lootboxAddress = Deno.env.get('LOOTBOX_ADDRESS');
        if (!lootboxAddress) {
            throw new Error("LOOTBOX_ADDRESS secret is not set in Supabase");
        }

        const provider = new ethers.JsonRpcProvider(Deno.env.get('RPC_URL'));
        const wallet = new ethers.Wallet(Deno.env.get('PRIVATE_KEY') ?? '', provider);
        const lootboxContract = new ethers.Contract(
            lootboxAddress,
            [
                "function openLootbox() external returns (uint256 requestId)",
                "event LootboxRequested(uint256 indexed requestId, address indexed user)"
            ],
            wallet
        );

        // Optional: Ensure Relayer has BOUNTY tokens if the contract burns from msg.sender
        // In this MVP, we assume the Relayer wallet is funded with BOUNTY.

        const tx = await lootboxContract.openLootbox();
        const receipt = await tx.wait();

        // Parse logs to find requestId
        const eventTopic = ethers.id("LootboxRequested(uint256,address)");
        const log = receipt.logs.find((l: any) => l.topics[0] === eventTopic);
        if (!log) throw new Error("LootboxRequested event not found in transaction logs");

        const parsedLog = lootboxContract.interface.parseLog(log);
        const requestId = parsedLog.args[0].toString();

        console.log(`[RelayLootbox] Lootbox requested. requestId: ${requestId}`);

        return new Response(
            JSON.stringify({ success: true, requestId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error: any) {
        console.error(`[RelayLootbox] Error:`, error);
        return new Response(
            JSON.stringify({
                error: error.message,
                details: error.details || error.hint || 'No additional details'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
