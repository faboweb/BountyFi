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
        const campaign_type = payload?.campaign_type || 'action'
        const campaign_rules = payload?.campaign_rules || ''

        let submissions = []
        if (target_id) {
            const { data, error } = await supabaseClient
                .from('submissions')
                .select('*, user:users(*)')
                .eq('id', target_id)
                .single()
            if (error) throw error
            submissions = [data]
        } else {
            const { data, error } = await supabaseClient
                .from('submissions')
                .select('*, user:users(*)')
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
            if (photoUrls.length === 0) continue

            try {
                let aiDecision = 'NEEDS_HUMAN_REVIEW'
                let aiResult: any = {}

                if (campaign_type === 'simple') {
                    // 1 Photo object detection
                    const output = await replicateRequest(VISION_VERSION, {
                        image: photoUrls[0],
                        prompt: `Task: Verify if this photo matches the rule: "${campaign_rules}". Answer only with "YES" or "NO" followed by a brief reason. Example: "YES: Found a red soda can."`
                    });
                    const rawText = Array.isArray(output) ? output.join("") : String(output);
                    const passed = rawText.toUpperCase().includes("YES");
                    aiDecision = passed ? 'AUTO_APPROVE' : 'AUTO_REJECT';
                    aiResult = { model: "Llama-Vision-Simple", raw_logic: rawText, decision: aiDecision };

                } else if (campaign_type === 'check_in') {
                    // 1 Photo Identity Consistency
                    const currentSelfie = photoUrls[0];
                    const enrollmentUrl = sub.user?.enrollment_photo_url;

                    if (!enrollmentUrl) {
                        // ENROLLMENT PHASE
                        const output = await replicateRequest(VISION_VERSION, {
                            image: currentSelfie,
                            prompt: "Is this a clear selfie of a person's face? Answer YES or NO. If YES, we will save this as their identity."
                        });
                        const rawText = Array.isArray(output) ? output.join("") : String(output);
                        if (rawText.toUpperCase().includes("YES")) {
                            // Update user's enrollment photo
                            await supabaseClient.from('users').update({ enrollment_photo_url: currentSelfie }).eq('id', sub.user_id);
                            aiDecision = 'AUTO_APPROVE';
                            aiResult = { mode: 'ENROLLMENT', decision: 'APPROVED', detail: 'Face enrolled successfully.' };
                        } else {
                            aiDecision = 'AUTO_REJECT';
                            aiResult = { mode: 'ENROLLMENT', decision: 'REJECTED', detail: 'No clear face found for enrollment.' };
                        }
                    } else {
                        // VERIFICATION PHASE
                        const output = await replicateRequest(VISION_VERSION, {
                            image: currentSelfie,
                            prompt: `Task: Compare this new photo with the enrollment photo at this URL: ${enrollmentUrl}. Do they appear to be the same person? Answer YES or NO and explain why.`
                        });
                        const rawText = Array.isArray(output) ? output.join("") : String(output);
                        const passed = rawText.toUpperCase().includes("YES");
                        aiDecision = passed ? 'AUTO_APPROVE' : 'NEEDS_HUMAN_REVIEW'; // Humans confirm borderline identities
                        aiResult = { mode: 'VERIFICATION', decision: aiDecision, raw_logic: rawText };
                    }

                } else {
                    // ACTION (Before/After) - Existing Strategy
                    if (photoUrls.length < 2) continue;
                    const beforeUrl = photoUrls[0];
                    const afterUrl = photoUrls[1];

                    const calibrationOutput = await replicateRequest(VISION_VERSION, {
                        image: beforeUrl,
                        prompt: "Two tasks: 1. Identify the specific trash/mess. 2. Describe the permanent background (floor, wall, table material). Output format: 'Mess: [item] | Background: [desc]'"
                    });

                    let rawText = Array.isArray(calibrationOutput) ? calibrationOutput.join("") : String(calibrationOutput);
                    const [messPart, bgPart] = rawText.split("|").map(s => s.trim());
                    const dirtyLabel = messPart ? messPart.replace("Mess:", "").trim() : "clutter";
                    const backgroundLabel = bgPart ? bgPart.replace("Background:", "").trim() : "background";

                    const combinedPrompts = `${dirtyLabel}|${backgroundLabel}`;
                    const scoresBefore = await replicateRequest(CLIP_VERSION, { image: beforeUrl, text: combinedPrompts });
                    const scoresAfter = await replicateRequest(CLIP_VERSION, { image: afterUrl, text: combinedPrompts });

                    const cleanImprovement = scoresBefore[0] - scoresAfter[0];
                    const bgConsistency = Math.abs(scoresBefore[1] - scoresAfter[1]);
                    const isCleaner = cleanImprovement > 0.15;
                    const isSameLocation = scoresAfter[1] > 0.6 && bgConsistency < 0.2;

                    aiDecision = (isCleaner && isSameLocation) ? 'AUTO_APPROVE' : 'NEEDS_HUMAN_REVIEW';
                    aiResult = {
                        model: "CLIP-Scene-Consistency",
                        metrics: { clean_delta: cleanImprovement, bg_consistency: bgConsistency },
                        decision: aiDecision
                    };
                }

                // Update Submission Trace and Status
                const trace = typeof sub.verification_trace === 'object' ? sub.verification_trace : {}
                trace['ai_verification'] = aiResult

                await supabaseClient.from('submissions').update({
                    status: aiDecision === 'AUTO_APPROVE' ? 'APPROVED' :
                        aiDecision === 'AUTO_REJECT' ? 'REJECTED' : 'NEEDS_HUMAN_REVIEW',
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
