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

        // Fetch campaign checkpoints and rules
        const { data: campaign, error: campaignError } = await supabaseClient
            .from('campaigns')
            .select('checkpoints, campaign_type, description, ai_threshold')
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
        const minPhotos = (campaign.campaign_type === 'TWO_PHOTO_CHANGE') ? 2 : 1;

        trace.steps.push({
            check: "photo_count",
            status: (photoCount >= minPhotos) ? "PASS" : "FAIL",
            details: `${photoCount} photos uploaded (min ${minPhotos})`
        })

        if (photoCount < minPhotos) allChecksPass = false

        // Determine AI Confidence
        let aiConfidence = 0; // Default 0 (Reject)

        // Decision Flow
        if (criticalFail) {
            trace.decision = "AUTO_REJECT"
            aiConfidence = 0;
        } else if (allChecksPass) {
            // Milestone 3: AI Vision Pre-filtering
            try {
                const aiResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/verify_semantic`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                    },
                    body: JSON.stringify({
                        submission_id: submission.id,
                        campaign_type: campaign.campaign_type || 'action',
                        campaign_rules: campaign.description || '' // Fallback to description as rules
                    })
                });

                if (!aiResp.ok) throw new Error(`AI Service Error: ${aiResp.statusText}`);

                const aiResult = await aiResp.json();

                if (aiResult.processed && aiResult.processed.length > 0) {
                    const aiDecision = aiResult.processed[0].decision;
                    const aiData = aiResult.processed[0].ai_result;

                    trace.decision = aiDecision;
                    // @ts-ignore
                    trace.ai_vision = aiData;

                    // Map Decision to Confidence (0-100)
                    if (aiDecision === 'AUTO_APPROVE') aiConfidence = 95;
                    else if (aiDecision === 'AUTO_REJECT') aiConfidence = 5;
                    else aiConfidence = 50; // Needs Review

                    trace.steps.push({
                        check: "ai_vision",
                        status: aiDecision === 'AUTO_REJECT' ? "FAIL" : "PASS",
                        details: `AI Reason: ${aiDecision} (Confidence: ${aiConfidence})`
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
                aiConfidence = 50;
            }

            if (trace.decision === "PENDING") {
                trace.decision = "AUTO_APPROVE"
                aiConfidence = 95;
            }
        } else {
            trace.decision = "NEEDS_HUMAN_REVIEW" // Or Reject if photo count fail?
            // If verify checks fail (but not critical like GPS), maybe human review?
            // Usually photo count fail is critical.
            if (!photoPass) {
                trace.decision = "AUTO_REJECT";
                aiConfidence = 0;
            } else {
                aiConfidence = 50;
            }
        }

        // Update Submission
        // Align DB Status with what Chain WILL decide based on aiConfidence vs Threshold
        // Chain: >= Threshold (80) -> Approved. < Threshold/2 (40) -> Rejected. Else -> Jury.
        const threshold = campaign.ai_threshold || 80;

        // This is purely for UI feedback. Chain is source of truth.
        let status = 'NEEDS_HUMAN_REVIEW';
        if (aiConfidence >= threshold) status = 'APPROVED'; // Should be 'AI_VERIFIED' really, but existing frontend expects APPROVED
        else if (aiConfidence < threshold / 2) status = 'REJECTED';
        else status = 'JURY_VOTING'; // Maps to NEEDS_HUMAN_REVIEW/JURY

        const { error: updateError } = await supabaseClient
            .from('submissions')
            .update({
                status: status === 'JURY_VOTING' ? 'NEEDS_HUMAN_REVIEW' : status, // Map back to DB enum if needed
                verification_trace: trace,
                ai_confidence: aiConfidence
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
