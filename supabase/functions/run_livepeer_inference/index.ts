import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
            // Processing specific submission
            const { data, error } = await supabaseClient
                .from('submissions')
                .select('*')
                .eq('id', target_id)
                .single()
            if (error) throw error
            submissions = [data]
        } else {
            // Batch processing PENDING ones
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
            if (photoUrls.length === 0) continue

            // 1. Fetch Campaign Context
            const { data: campaign } = await supabaseClient
                .from('campaigns')
                .select('title, rules')
                .eq('id', sub.campaign_id)
                .single()

            const campaignRules = campaign ? campaign.rules : "Verify this submission."
            const apiKey = Deno.env.get('LIVEPEER_API_KEY')

            const captions = []
            const rawVisionResponses = []

            if (apiKey) {
                for (let i = 0; i < photoUrls.length; i++) {
                    const imageUrl = photoUrls[i]
                    try {
                        const imgResp = await fetch(imageUrl)
                        const imgBlob = await imgResp.blob()

                        const formData = new FormData()
                        const file = new File([imgBlob], `photo_${i}.jpg`, { type: 'image/jpeg' })
                        formData.append('image', file)
                        formData.append('model_id', 'Salesforce/blip-image-captioning-base') // Use base for better stability
                        formData.append('prompt', `Describe what is in this image. Focus on details related to: "${campaignRules}"`)

                        const visionUrl = "https://livepeer.studio/api/beta/generate/image-to-text"
                        const vResp = await fetch(visionUrl, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${apiKey}` },
                            body: formData
                        })

                        if (vResp.ok) {
                            const vData = await vResp.json()
                            const text = vData.text || ""
                            captions.push(`Photo ${i + 1}: ${text}`)
                            rawVisionResponses.push(vData)
                        } else {
                            const err = await vResp.text()
                            console.error(`Vision API Error (${vResp.status}):`, err)
                            rawVisionResponses.push({ error: err, status: vResp.status })
                        }
                    } catch (e) {
                        console.error(`Vision processing failed for photo ${i}:`, e)
                        rawVisionResponses.push({ error: String(e) })
                    }
                }

                // 2. LLM Comparison Logic
                let aiDecision = 'NEEDS_HUMAN_REVIEW'
                let llmReasoning = ""
                let rawLlmResponse = null

                if (captions.length > 0) {
                    try {
                        const llmPrompt = `
Task: ${campaign.title}
Rules: ${campaignRules}

I have ${captions.length} images for this task. Here are their descriptions:
${captions.join("\n")}

Questions:
1. Do these images show the same location/scene (if multi-photo)?
2. Does the visual evidence show the task was completed according to the rules?
3. If this is a before/after task, is there a clear improvement?

Decision must be one of: AUTO_APPROVE, AUTO_REJECT, NEEDS_HUMAN_REVIEW.
Provide reasoning and then the final decision.
`

                        const llmUrl = "https://livepeer.studio/api/beta/generate/llm"
                        const lResp = await fetch(llmUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: "meta-llama/Llama-3-8b-chat-hf",
                                messages: [
                                    { role: "system", content: "You are an AI verifier for a bounty platform. Be strict but fair." },
                                    { role: "user", content: llmPrompt }
                                ],
                                temperature: 0.2
                            })
                        })

                        if (lResp.ok) {
                            rawLlmResponse = await lResp.json()
                            llmReasoning = rawLlmResponse.choices?.[0]?.message?.content || rawLlmResponse.text || ""
                            console.log(`LLM Reasoning for ${sub.id}:`, llmReasoning)

                            if (llmReasoning.includes("AUTO_APPROVE")) aiDecision = 'AUTO_APPROVE'
                            else if (llmReasoning.includes("AUTO_REJECT")) aiDecision = 'AUTO_REJECT'
                        } else {
                            const err = await lResp.text()
                            console.error(`LLM API Error (${lResp.status}):`, err)
                            llmReasoning = "LLM Comparison Service Unavailable."
                        }
                    } catch (e) {
                        console.error("LLM processing failed:", e)
                        llmReasoning = "LLM Processing Error."
                    }
                }

                const aiResult = {
                    model: "Livepeer-Hybrid-Vision-LLM",
                    vision_captions: captions,
                    llm_reasoning: llmReasoning,
                    decision: aiDecision,
                    raw_vision: rawVisionResponses,
                    raw_llm: rawLlmResponse,
                    timestamp: new Date().toISOString()
                }

                // 4. Update DB (Only if batch mode / not specific target)
                if (!target_id) {
                    const trace = typeof sub.verification_trace === 'object' ? sub.verification_trace : {}
                    trace['ai_vision'] = aiResult

                    await supabaseClient
                        .from('submissions')
                        .update({
                            status: aiDecision === 'AUTO_APPROVE' ? 'APPROVED' :
                                aiDecision === 'AUTO_REJECT' ? 'REJECTED' :
                                    'NEEDS_HUMAN_REVIEW',
                            verification_trace: trace
                        })
                        .eq('id', sub.id)
                }

                results.push({ id: sub.id, decision: aiDecision, ai_result: aiResult })
            }
        }

        return new Response(
            JSON.stringify({ processed: results }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
