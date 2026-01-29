import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY')
const VISION_VERSION = "d4e81fc1472556464f1ee5cea4de177b2fe95a6eaadb5f63335df1ba654597af" // Llama 3.2 11b Vision
const CLIP_VERSION = "566ab1f111e526640c5154e712d4d54961414278f89d36590f1425badc763ecb"   // CLIP vit-large-patch14

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
        const payload = await req.json()
        const target_id = payload?.submission_id

        let submissions = []
        if (target_id) {
            const { data, error } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('id', target_id)
                .single()
            if (error) throw error
            submissions = [data]
        } else {
            const { data, error } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('status', 'PENDING')
                .limit(5)
            if (error) throw error
            submissions = data || []
        }

        if (submissions.length === 0) {
            return new Response(JSON.stringify({ message: "No submissions to process" }), {
                headers: { "Content-Type": "application/json" },
            })
        }

        const results = []
        for (const sub of submissions) {
            const photoUrls = sub.photo_urls || []
            if (photoUrls.length < 2) continue // Need before/after pair

            const beforeUrl = photoUrls[0]
            const afterUrl = photoUrls[1]

            try {
                // 1. Dynamic Calibration (Reverse Prompting)
                // Identify mess in before, identify clean in after
                const beforeOutput = await replicateRequest(VISION_VERSION, {
                    image: beforeUrl,
                    prompt: "Identify one specific item of trash or clutter in this image. 3 words max. Example: 'plastic coffee cup'"
                });
                const dirtyLabel = Array.isArray(beforeOutput) ? beforeOutput.join("").trim() : String(beforeOutput).trim();

                const afterOutput = await replicateRequest(VISION_VERSION, {
                    image: afterUrl,
                    prompt: "Describe the surface in this image after the clutter is gone. 3 words max. Example: 'clean wooden top'"
                });
                const cleanLabel = Array.isArray(afterOutput) ? afterOutput.join("").trim() : String(afterOutput).trim();

                // 2. Semantic Comparison (CLIP)
                const combinedPrompts = `${dirtyLabel}|${cleanLabel}`;

                const scoresBefore = await replicateRequest(CLIP_VERSION, { image: beforeUrl, text: combinedPrompts });
                const scoresAfter = await replicateRequest(CLIP_VERSION, { image: afterUrl, text: combinedPrompts });

                // scores are [dirty_score, clean_score]
                const beforeIsDirty = scoresBefore[0] > 0.6;
                const afterIsClean = scoresAfter[1] > 0.7;
                const cleanImprovement = scoresAfter[1] - scoresBefore[1];

                let aiDecision = 'NEEDS_HUMAN_REVIEW';
                if (beforeIsDirty && afterIsClean && cleanImprovement > 0.1) {
                    aiDecision = 'AUTO_APPROVE';
                }

                const aiResult = {
                    model: "Replicate-Adaptive-CLIP",
                    labels: { dirty: dirtyLabel, clean: cleanLabel },
                    scores: {
                        before: { dirty: scoresBefore[0], clean: scoresBefore[1] },
                        after: { dirty: scoresAfter[0], clean: scoresAfter[1] }
                    },
                    improvement: cleanImprovement,
                    decision: aiDecision,
                    timestamp: new Date().toISOString()
                };

                // 3. Log to Data Flywheel (verification_data)
                await supabaseClient.from('verification_data').insert([
                    { submission_id: sub.id, image_url: beforeUrl, state_type: 'BEFORE', suggested_label: dirtyLabel, clip_score: scoresBefore[0], model_version: 'CLIP-L/14' },
                    { submission_id: sub.id, image_url: afterUrl, state_type: 'AFTER', suggested_label: cleanLabel, clip_score: scoresAfter[1], model_version: 'CLIP-L/14' }
                ]);

                // 4. Update Submission
                const trace = typeof sub.verification_trace === 'object' ? sub.verification_trace : {}
                trace['semantic_verification'] = aiResult

                await supabaseClient.from('submissions').update({
                    status: aiDecision === 'AUTO_APPROVE' ? 'APPROVED' : 'NEEDS_HUMAN_REVIEW',
                    verification_trace: trace
                }).eq('id', sub.id);

                results.push({ id: sub.id, decision: aiDecision, ai_result: aiResult });

            } catch (e) {
                console.error(`Verification failed for submission ${sub.id}:`, e);
                results.push({ id: sub.id, error: String(e) });
            }
        }

        return new Response(JSON.stringify({ processed: results }), {
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
        })
    }
})
