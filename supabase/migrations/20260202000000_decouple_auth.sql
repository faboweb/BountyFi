-- Migration: Decouple Identity from Supabase Auth
-- Support wallet-address based queries for tasks and earnings

-- 1. Helper to get tasks by wallet address
CREATE OR REPLACE FUNCTION get_validator_tasks_by_wallet(v_wallet TEXT)
RETURNS TABLE (
    id UUID,
    campaign_id UUID,
    photo_url TEXT,
    lat NUMERIC,
    lng NUMERIC,
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
    -- Map wallet to Supabase ID if it exists (for legacy/stats compatibility)
    -- If no user exists, we might need to create a profile, but for now we filter by address.
    SELECT id INTO v_id FROM users WHERE wallet_address = v_wallet;
    
    -- Check Daily Limit (10 per day)
    -- If v_id is null, they haven't voted yet, so limit is 0.
    IF v_id IS NOT NULL THEN
        SELECT COUNT(*) INTO daily_votes 
        FROM votes 
        WHERE validator_id = v_id 
          AND created_at > NOW() - INTERVAL '1 day';

        IF daily_votes >= 10 THEN
            RETURN;
        END IF;
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
      -- Anti-collusion: cannot vote on own submission by address
      AND s.submitter_address != v_wallet
      -- Exclude already voted by this wallet
      AND s.id NOT IN (
          SELECT submission_id 
          FROM votes v 
          JOIN users vu ON v.validator_id = vu.id 
          WHERE vu.wallet_address = v_wallet
      )
      -- Trust Network filters (updated to use wallet address)
      AND (v_wallet IS NULL OR (
          s.submitter_address NOT IN (SELECT trustee_address FROM trust_relations WHERE truster_address = v_wallet)
          AND s.submitter_address NOT IN (SELECT truster_address FROM trust_relations WHERE trustee_address = v_wallet)
          AND s.submitter_address NOT IN (SELECT user_address FROM referrals WHERE referrer_address = v_wallet)
          AND s.submitter_address != (SELECT referrer_address FROM referrals WHERE user_address = v_wallet)
      ))
    ORDER BY s.created_at ASC
    LIMIT 1;
END;
$$;

-- 3. Schema updates for votes and tickets
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS validator_address TEXT;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_address TEXT;
ALTER TABLE public.validators ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_validator_address ON public.votes(validator_address);
CREATE INDEX IF NOT EXISTS idx_tickets_user_address ON public.tickets(user_address);
CREATE INDEX IF NOT EXISTS idx_validators_wallet_address ON public.validators(wallet_address);

-- 4. Update get_earnings_24h_by_wallet to use new column
CREATE OR REPLACE FUNCTION get_earnings_24h_by_wallet(v_wallet TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total INTEGER;
BEGIN
    -- Check new user_address column first, then join users table as fallback
    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM tickets
    WHERE (user_address = v_wallet OR user_id IN (SELECT id FROM users WHERE wallet_address = v_wallet))
      AND created_at > NOW() - INTERVAL '24 hours';
    RETURN total;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_validator_tasks_by_wallet(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_earnings_24h_by_wallet(TEXT) TO authenticated, anon;
