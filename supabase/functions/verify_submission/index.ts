import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Haversine distance calculation
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Radius of the earth in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in meters
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

serve(async (req) => {
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        const payload = await req.json()
        // Support both direct calls and webhook payloads
        const submission = payload.record || payload

        if (!submission || !submission.id) {
            throw new Error("Invalid submission data")
        }

        // Fetch campaign checkpoints
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select('checkpoints')
            .eq('id', submission.campaign_id)
            .single()

        if (campaignError) throw campaignError

        // Verification Logic
        const trace = {
            agent_version: "v1.0",
            steps: [] as any[],
            decision: "PENDING",
            timestamp: new Date().toISOString()
        }

        let allChecksPass = true
        let criticalFail = false

        // Check 1: GPS Radius
        let gpsPass = false
        let minDistance = Infinity

        const checkpoints = typeof campaign.checkpoints === 'string'
            ? JSON.parse(campaign.checkpoints)
            : campaign.checkpoints

        if (submission.gps_lat && submission.gps_lng && checkpoints) {
            for (const cp of checkpoints) {
                const dist = getDistanceFromLatLonInMeters(
                    submission.gps_lat,
                    submission.gps_lng,
                    cp.lat,
                    cp.lng
                )
                if (dist < minDistance) minDistance = dist
                if (dist <= cp.radius) {
                    gpsPass = true
                    break
                }
            }

            trace.steps.push({
                check: "gps_radius",
                status: gpsPass ? "PASS" : "FAIL",
                details: gpsPass
                    ? `Within radius (${Math.round(minDistance)}m)`
                    : `Outside all checkpoints (nearest: ${Math.round(minDistance)}m)`
            })
        } else {
            trace.steps.push({
                check: "gps_radius",
                status: "FAIL",
                details: "Missing GPS data or checkpoints"
            })
            gpsPass = false
        }

        if (!gpsPass) {
            allChecksPass = false
            criticalFail = true
        }

        // Check 2: Photo Count
        const photoCount = submission.photo_urls ? submission.photo_urls.length : 0
        const photoPass = photoCount >= 1 // Minimum 1 for MVP

        trace.steps.push({
            check: "photo_count",
            status: photoPass ? "PASS" : "FAIL",
            details: `${photoCount} photos uploaded (min 1)`
        })

        if (!photoPass) allChecksPass = false

        // Decision
        if (criticalFail) {
            trace.decision = "AUTO_REJECT"
        } else if (allChecksPass) {
            // Milestone 3: AI Vision Pre-filtering
            try {
                const aiResp = await fetch('https://cguqjaoeleifeaxktmwv.supabase.co/functions/v1/verify_semantic', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        submission_id: submission.id,
                        campaign_type: campaign.type || 'action',
                        campaign_rules: campaign.rules
                    })
                });
                const aiResult = await aiResp.json();

                if (aiResult.processed && aiResult.processed.length > 0) {
                    const aiDecision = aiResult.processed[0].decision;
                    const aiData = aiResult.processed[0].ai_result;

                    trace.decision = aiDecision;
                    // @ts-ignore
                    trace.ai_vision = aiData;

                    trace.steps.push({
                        check: "ai_vision",
                        status: aiDecision === 'AUTO_REJECT' ? "FAIL" : "PASS",
                        details: `AI Reason: ${aiDecision}`
                    });
                }
            } catch (e) {
                console.error("AI trigger failed:", e);
                trace.steps.push({
                    check: "ai_vision",
                    status: "FAIL",
                    details: "AI service unreachable, falling back to human review"
                });
                trace.decision = "NEEDS_HUMAN_REVIEW";
            }

            if (trace.decision === "PENDING") {
                trace.decision = "AUTO_APPROVE"
            }
        } else {
            trace.decision = "NEEDS_HUMAN_REVIEW"
        }

        // Update Submission
        const status = trace.decision === 'AUTO_APPROVE' ? 'APPROVED' :
            trace.decision === 'AUTO_REJECT' ? 'REJECTED' :
                'NEEDS_HUMAN_REVIEW';

        const { error: updateError } = await supabaseClient
            .from('submissions')
            .update({
                status,
                verification_trace: trace
            })
            .eq('id', submission.id)

        if (updateError) throw updateError

        return new Response(
            JSON.stringify(trace),
            { headers: { "Content-Type": "application/json" } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
