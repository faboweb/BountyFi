import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { votes, validator_address } = await req.json()

        if (!votes || !Array.isArray(votes) || votes.length === 0 || !validator_address) {
            throw new Error("Missing required fields: votes (array) and validator_address")
        }

        const results: { submission_id: string; success: boolean; error?: string; grading?: any }[] = []

        for (const v of votes) {
            const { submission_id, decision } = v
            if (!submission_id || !decision) {
                results.push({ submission_id: submission_id || 'unknown', success: false, error: "Missing submission_id or decision" })
                continue
            }

            try {
                // 1. Anti-collusion Check
                const { data: submission, error: subError } = await supabaseClient
                    .from('submissions')
                    .select('submitter_address')
                    .eq('id', submission_id)
                    .single()

                if (subError) {
                    results.push({ submission_id, success: false, error: subError.message })
                    continue
                }
                if (submission.submitter_address === validator_address) {
                    results.push({ submission_id, success: false, error: "Collusion: cannot vote on own submission" })
                    continue
                }

                // 2. Record Vote
                const { error: voteError } = await supabaseClient
                    .from('votes')
                    .insert({
                        submission_id,
                        validator_address,
                        decision,
                        reason: 'Batch validated via app'
                    })

                if (voteError) {
                    results.push({ submission_id, success: false, error: voteError.message })
                    continue
                }

                // 3. Check for Consensus
                const { data: allVotes, error: countError } = await supabaseClient
                    .from('votes')
                    .select('decision')
                    .eq('submission_id', submission_id)

                if (countError) {
                    results.push({ submission_id, success: false, error: countError.message })
                    continue
                }

                const REQUIRED_VOTES = 3
                let gradingResult = null
                if (allVotes.length >= REQUIRED_VOTES) {
                    const counts = allVotes.reduce((acc: any, vote: any) => {
                        acc[vote.decision] = (acc[vote.decision] || 0) + 1
                        return acc
                    }, {})

                    let finalDecision = 'UNCLEAR'
                    if ((counts['APPROVE'] || 0) >= 2) finalDecision = 'APPROVED'
                    if ((counts['REJECT'] || 0) >= 2) finalDecision = 'REJECTED'

                    if (finalDecision !== 'UNCLEAR') {
                        await supabaseClient
                            .from('submissions')
                            .update({ status: finalDecision })
                            .eq('id', submission_id)
                    }
                }

                // Golden Task Grading
                const { data: goldenTask } = await supabaseClient
                    .from('golden_tasks')
                    .select('expected_outcome')
                    .eq('submission_id', submission_id)
                    .single()

                if (goldenTask) {
                    const isCorrect = (decision === goldenTask.expected_outcome)
                    gradingResult = {
                        is_golden: true,
                        correct: isCorrect,
                        message: isCorrect ? "Correct! You earned a Trust Diamond." : "Incorrect. This was a known test case."
                    }
                }

                // 4. Update Validator Stats
                const { data: validator } = await supabaseClient
                    .from('validators')
                    .select('validations_today, total_validations, tickets_earned')
                    .eq('wallet_address', validator_address)
                    .single()

                let newTotal = 1
                let newToday = 1
                if (validator) {
                    newTotal = (validator.total_validations || 0) + 1
                    newToday = (validator.validations_today || 0) + 1
                    await supabaseClient
                        .from('validators')
                        .update({ validations_today: newToday, total_validations: newTotal })
                        .eq('wallet_address', validator_address)
                }

                if (newTotal % 10 === 0) {
                    await supabaseClient.from('tickets').insert({
                        user_address: validator_address,
                        amount: 1,
                        source: 'validator_milestone'
                    })
                }

                results.push({ submission_id, success: true, grading: gradingResult })
            } catch (innerErr: any) {
                results.push({ submission_id, success: false, error: innerErr.message })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failCount = results.filter(r => !r.success).length

        return new Response(
            JSON.stringify({
                message: `Processed ${votes.length} votes: ${successCount} succeeded, ${failCount} failed`,
                results,
                successCount,
                failCount
            }),
            { headers: { "Content-Type": "application/json" } },
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
