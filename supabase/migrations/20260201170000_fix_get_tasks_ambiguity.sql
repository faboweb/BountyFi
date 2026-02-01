-- Fix for "cannot change return type of existing function" (42P13)
-- We must drop the function first because the return signature has changed (photo_url -> before/after, lat/lng -> gps_lat/gps_lng)

DROP FUNCTION IF EXISTS get_validator_tasks_by_wallet(TEXT);

CREATE OR REPLACE FUNCTION get_validator_tasks_by_wallet(v_wallet TEXT)
RETURNS TABLE (
    id UUID,
    campaign_id UUID,
    user_id UUID,
    submitter_address TEXT,
    before_photo_url TEXT,
    after_photo_url TEXT,
    gps_lat NUMERIC,
    gps_lng NUMERIC,
    created_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_votes INTEGER;
    v_id UUID;
BEGIN
    -- Resolved ambiguous id by aliasing users table
    SELECT u.id INTO v_id FROM users u WHERE u.wallet_address = v_wallet;

    IF v_id IS NOT NULL THEN
        SELECT COUNT(*) INTO daily_votes
        FROM votes v
        WHERE (v.validator_id = v_id OR v.validator_address = v_wallet)
          AND v.created_at > NOW() - INTERVAL '1 day';

        IF daily_votes >= 10 THEN
            RETURN;
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        s.id,
        s.campaign_id,
        s.user_id,
        s.submitter_address,
        COALESCE(s.photo_urls[1], s.photo_url)::TEXT AS before_photo_url,
        COALESCE(s.photo_urls[2], s.photo_url)::TEXT AS after_photo_url,
        COALESCE(s.gps_lat, s.lat) AS gps_lat,
        COALESCE(s.gps_lng, s.lng) AS gps_lng,
        s.created_at,
        s.status
    FROM submissions s
    WHERE s.status IN ('PENDING', 'NEEDS_HUMAN_REVIEW')
      AND (s.submitter_address IS NULL OR s.submitter_address != v_wallet)
      AND s.id NOT IN (
          SELECT v.submission_id
          FROM votes v
          LEFT JOIN users vu ON v.validator_id = vu.id
          WHERE v.validator_address = v_wallet OR vu.wallet_address = v_wallet
      )
      AND (v_wallet IS NULL OR (
          s.submitter_address NOT IN (SELECT trustee_address FROM trust_relations WHERE truster_address = v_wallet)
          AND s.submitter_address NOT IN (SELECT truster_address FROM trust_relations WHERE trustee_address = v_wallet)
          AND s.submitter_address NOT IN (SELECT user_address FROM referrals WHERE referrer_address = v_wallet)
          AND s.submitter_address IS DISTINCT FROM (SELECT referrer_address FROM referrals WHERE user_address = v_wallet)
      ))
    ORDER BY s.created_at ASC
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION get_validator_tasks_by_wallet(TEXT) TO authenticated, anon;
