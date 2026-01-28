import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const { submission_id, validator_id, decision, reason } = await req.json()

        if (!submission_id || !validator_id || !decision) {
            throw new Error("Missing required fields")
        }

        // 1. Anti-collusion Check
        const { data: submission, error: subError } = await supabaseClient
            .from('submissions')
            .select('user_id')
            .eq('id', submission_id)
            .single()

        if (subError) throw subError
        if (submission.user_id === validator_id) {
            throw new Error("Collusion detected: You cannot vote on your own submission")
        }

        // 2. Record Vote
        const { error: voteError } = await supabaseClient
            .from('votes')
            .insert({
                submission_id,
                validator_id,
                decision,
                reason
            })

        if (voteError) throw voteError

        // 2. Check for Consensus
        const { data: votes, error: countError } = await supabaseClient
            .from('votes')
            .select('decision')
            .eq('submission_id', submission_id)

        if (countError) throw countError

        const REQUIRED_VOTES = 3
        if (votes.length >= REQUIRED_VOTES) {
            // Calculate majority
            const counts = votes.reduce((acc: any, vote: any) => {
                acc[vote.decision] = (acc[vote.decision] || 0) + 1
                return acc
            }, {})

            let finalDecision = 'UNCLEAR'
            if ((counts['APPROVE'] || 0) >= 2) finalDecision = 'APPROVED'
            if ((counts['REJECT'] || 0) >= 2) finalDecision = 'REJECTED'

            console.log(`Consensus reached for ${submission_id}: ${finalDecision}`)

            // Update Submission
            if (finalDecision !== 'UNCLEAR') {
                await supabaseClient
                    .from('submissions')
                    .update({ status: finalDecision })
                    .eq('id', submission_id)
            } else {
                // Tie-breaker trigger (omitted for MVP, maybe stay NEEDS_HUMAN_REVIEW)
            }

            // Reward Validators
            // In a real app, strict logic prevents double-rewarding. For hackathon, just mint +1 ticket.
            // This part could be complex, for MVP simple +1 ticket per validation
        }

        // 3. Increment Validator Stats
        // Implementation of increments usually done via RPC or careful update
        // We'll skip complex atomic increment for hackathon MVP and just trust client/edge logic
        const { data: validator } = await supabaseClient
            .from('validators')
            .select('validations_today, tickets_earned')
            .eq('user_id', validator_id)
            .single()

        // Upsert validator stats
        if (validator) {
            await supabaseClient
                .from('validators')
                .update({
                    validations_today: validator.validations_today + 1,
                    total_validations: (validator.total_validations || 0) + 1
                })
                .eq('user_id', validator_id)
        } else {
            await supabaseClient
                .from('validators')
                .insert({
                    user_id: validator_id,
                    validations_today: 1,
                    total_validations: 1
                })
        }

        return new Response(
            JSON.stringify({ message: "Vote recorded" }),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
