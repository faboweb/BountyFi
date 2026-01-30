import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { ethers } from "https://esm.sh/ethers@6.13.2"

const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
const RPC_URL = Deno.env.get('RPC_URL')
const ORACLE_PRIVATE_KEY = Deno.env.get('ORACLE_PRIVATE_KEY')
const BOUNTYFI_ADDRESS = Deno.env.get('BOUNTYFI_ADDRESS')

const VISION_VERSION = "d4e81fc1472556464f1ee5cea4de177b2fe95a6eaadb5f63335df1ba654597af"

const BOUNTYFI_ABI = [
    "function submitAIScore(uint256 _submissionId, uint256 _confidence) external"
]

async function replicateRequest(version: string, input: any) {
    const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            "Authorization": `Token ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ version, input })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Replicate API Error: ${err}`);
    }

    let result = await response.json();
    while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise(r => setTimeout(r, 1000));
        const res = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
            headers: { "Authorization": `Token ${REPLICATE_API_KEY}` }
        });
        result = await res.json();
    }
    if (result.status === "failed") throw new Error(`Replicate Prediction Failed: ${result.error}`);
    return result.output;
}

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { submission_id, photo_url, campaign_rules } = await req.json()

        // 1. Run AI Inference
        console.log(`Processing submission ${submission_id} with AI...`)
        const output = await replicateRequest(VISION_VERSION, {
            image: photo_url,
            prompt: `Task: Verify if this photo matches the rule: "${campaign_rules}". Rate the confidence from 0 to 100 that it matches. Output ONLY the number.`
        });

        const rawText = Array.isArray(output) ? output.join("") : String(output);
        const confidence = parseInt(rawText.replace(/\D/g, '')) || 0;
        console.log(`AI Confidence: ${confidence}`)

        // 2. Push to Chain
        if (!RPC_URL || !ORACLE_PRIVATE_KEY || !BOUNTYFI_ADDRESS) {
            throw new Error("Missing Chain Config")
        }

        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider)
        const contract = new ethers.Contract(BOUNTYFI_ADDRESS, BOUNTYFI_ABI, wallet)

        console.log(`Submitting score to contract for sub ${submission_id}...`)
        const tx = await contract.submitAIScore(submission_id, confidence)
        await tx.wait()
        console.log(`Tx settled: ${tx.hash}`)

        // 3. Save Verdict to DB
        await supabaseClient.from('ai_verdicts').upsert({
            submission_id,
            model: "Llama-Vision-11b",
            confidence,
            results: { rawText },
            trace: { tx_hash: tx.hash }
        })

        return new Response(JSON.stringify({ success: true, confidence, tx: tx.hash }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
        })
    }
})
