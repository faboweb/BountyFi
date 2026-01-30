import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@5.7.2"

const PRIV_KEY = Deno.env.get('PRIVATE_KEY')!
const RPC_URL = "https://sepolia.base.org"

// Contract Addresses (Base Sepolia) - UPDATE THESE AFTER DEPLOYMENT
const BOUNTYFI_ADDR = "0x0000000000000000000000000000000000000000" // Placeholder

const BOUNTYFI_ABI = [
    "function submitAIScore(uint256 _submissionId, uint256 _confidence) external"
]

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        // 1. Fetch Submissions with AI Confidence that haven't been submitted to chain AI processing
        // We look for 'AI_VERIFIED' or 'APPROVED' status in DB (or just confidence set)
        // AND ensuring onchain_id is set (Indexer saw it)
        const { data: submissions, error } = await supabase
            .from('submissions')
            .select('*')
            .not('ai_confidence', 'is', null)
            .not('onchain_id', 'is', null) // Wait for Indexer!
            .is('onchain_tx', null) // Haven't sent AI Score yet
            .limit(5)

        if (error) throw error
        if (!submissions || submissions.length === 0) {
            return new Response(JSON.stringify({ message: "No submissions to settle" }), { headers: { 'Content-Type': 'application/json' } })
        }

        console.log(`Found ${submissions.length} submissions to settle`)

        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        const wallet = new ethers.Wallet(PRIV_KEY, provider)
        const bountyFiContract = new ethers.Contract(BOUNTYFI_ADDR, BOUNTYFI_ABI, wallet)

        const results = []

        // 2. Process each
        for (const sub of submissions) {
            console.log(`Settling submission ${sub.id} (Score: ${sub.ai_confidence})...`)

            try {
                // Call submitAIScore
                // Note: sub.id is UUID string in DB, but uint256 in Contract.
                // We need a mapping or a way to convert. 
                // For this MVP, let's assume we use a numeric ID or hash.
                // If contract uses counter (nextSubmissionId), we can't easily map UUID to it unless we stored the on-chain ID.
                // Assumption: The DB 'id' column is BIGINT matching the contract ID (as seen in schema 20260129_bountyfi_v2.sql)

                const tx = await bountyFiContract.submitAIScore(sub.id, sub.ai_confidence, {
                    gasLimit: 500000 // Hardcoded for safety
                })

                console.log(`submitAIScore TX: ${tx.hash}`)
                const receipt = await tx.wait()

                // Update DB
                await supabase.from('submissions').update({
                    onchain_tx: receipt.transactionHash,
                    onchain_status: 'SETTLED'
                }).eq('id', sub.id)

                results.push({ id: sub.id, tx: receipt.transactionHash })

            } catch (err) {
                console.error(`Failed to settle ${sub.id}:`, err)
                // Log error status
                await supabase.from('submissions').update({
                    onchain_status: 'ERROR: ' + String(err).substring(0, 100)
                }).eq('id', sub.id)
            }
        }

        return new Response(JSON.stringify({ settled: results }), { headers: { 'Content-Type': 'application/json' } })

    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
})
