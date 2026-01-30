-- Migration: Separate Golden Tasks Metadata
-- Goal: Hide secret 'is_golden' and 'expected_outcome' fields from the public 'submissions' table.

-- 1. Create Private Table
CREATE TABLE IF NOT EXISTS public.golden_tasks (
    submission_id UUID PRIMARY KEY REFERENCES public.submissions(id) ON DELETE CASCADE,
    expected_outcome TEXT NOT NULL, -- 'APPROVE' | 'REJECT'
    golden_content JSONB, -- Mismatch metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.golden_tasks ENABLE ROW LEVEL SECURITY;

-- No public policies! Only Service Role (Edge Functions) can access.

-- 2. Migrate Existing Data (if any)
INSERT INTO public.golden_tasks (submission_id, expected_outcome, golden_content)
SELECT id, expected_outcome, golden_content
FROM public.submissions
WHERE is_golden = TRUE;

-- 3. Drop Columns from Submissions
-- We drop 'is_golden' to ensure no client can peek at it.
-- Any future query for 'is_golden' on this table will fail, forcing updates to logic.

ALTER TABLE public.submissions DROP COLUMN IF EXISTS is_golden;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS expected_outcome;
ALTER TABLE public.submissions DROP COLUMN IF EXISTS golden_content;

-- 4. Update get_validator_tasks to be Explicit
-- Prevent 'SELECT *' from leaking anything if we add more columns later.
-- Also ensure we don't try to select dropped columns.

DROP FUNCTION IF EXISTS get_validator_tasks(UUID);

CREATE OR REPLACE FUNCTION get_validator_tasks(v_id UUID)
RETURNS TABLE (
    id UUID,
    campaign_id UUID,
    photo_url TEXT,
    lat NUMERIC,
    lng NUMERIC,
    created_at TIMESTAMPTZ,
    status TEXT
    -- NO hidden fields
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_votes INTEGER;
    user_addr TEXT;
BEGIN
    SELECT wallet_address INTO user_addr FROM users WHERE id = v_id;
    
    SELECT COUNT(*) INTO daily_votes 
    FROM votes 
    WHERE validator_id = v_id 
      AND created_at > NOW() - INTERVAL '1 day';

    IF daily_votes >= 10 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        s.id,
        s.campaign_id,
        s.photo_url,
        s.lat,
        s.lng,
        s.created_at,
        s.status
    FROM submissions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'NEEDS_HUMAN_REVIEW'
      AND s.user_id != v_id
      AND s.id NOT IN (SELECT submission_id FROM votes WHERE validator_id = v_id)
      AND (user_addr IS NULL OR (
          u.wallet_address NOT IN (SELECT trustee_address FROM trust_relations WHERE truster_address = user_addr)
          AND u.wallet_address NOT IN (SELECT truster_address FROM trust_relations WHERE trustee_address = user_addr)
          AND u.wallet_address NOT IN (SELECT user_address FROM referrals WHERE referrer_address = user_addr)
          AND u.wallet_address != (SELECT referrer_address FROM referrals WHERE user_address = user_addr)
      ))
    ORDER BY s.created_at ASC
    LIMIT 1;
END;
$$;
