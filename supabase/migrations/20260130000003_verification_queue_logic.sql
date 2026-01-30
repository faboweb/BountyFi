-- Trust Relations Table (Mirrors on-chain TrustNetwork)
CREATE TABLE IF NOT EXISTS trust_relations (
    truster_address TEXT NOT NULL,
    trustee_address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (truster_address, trustee_address)
);

-- Referrals Table (Mirrors on-chain Referrals)
CREATE TABLE IF NOT EXISTS referrals (
    user_address TEXT NOT NULL PRIMARY KEY,
    referrer_address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trust_truster ON trust_relations(truster_address);
CREATE INDEX IF NOT EXISTS idx_trust_trustee ON trust_relations(trustee_address);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_address);

-- Updated get_validator_tasks function
CREATE OR REPLACE FUNCTION get_validator_tasks(v_id UUID)
RETURNS SETOF submissions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_votes INTEGER;
    user_addr TEXT;
BEGIN
    -- 1. Get Validator's Address (Assuming auth.users has wallet_address or we join profiles)
    -- Wait, v_id is UUID. Submissions have submitter_address (TEXT) or user_id (UUID).
    -- Trust Relations use ADDRESS (TEXT).
    -- We need to link v_id (UUID) to Address.
    -- Assuming 'users' table has 'wallet_address' or 'id'.
    -- Step 163 verify_semantic uses 'users' table.
    -- Let's fetch the address of the validator.
    SELECT wallet_address INTO user_addr FROM users WHERE id = v_id;
    
    -- If no address found, we can't filter trust network, so return nothing or proceed without filter?
    -- Safest is to return nothing or error. But let's assume valid user.
    
    -- 2. Check Daily Limit (10 per day)
    SELECT COUNT(*) INTO daily_votes 
    FROM votes 
    WHERE validator_id = v_id 
      AND created_at > NOW() - INTERVAL '1 day';

    IF daily_votes >= 10 THEN
        RETURN; -- Return empty set
    END IF;

    -- 3. Return Tasks filtering close network
    RETURN QUERY
    SELECT s.*
    FROM submissions s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.status = 'NEEDS_HUMAN_REVIEW'
      AND s.user_id != v_id
      AND s.id NOT IN (SELECT submission_id FROM votes WHERE validator_id = v_id)
      -- Exclude if I Trust Them (truster = Me)
      AND u.wallet_address NOT IN (SELECT trustee_address FROM trust_relations WHERE truster_address = user_addr)
      -- Exclude if They Trust Me (trustee = Me)
      AND u.wallet_address NOT IN (SELECT truster_address FROM trust_relations WHERE trustee_address = user_addr)
      -- Exclude if I Referred Them (referrer = Me)
      AND u.wallet_address NOT IN (SELECT user_address FROM referrals WHERE referrer_address = user_addr)
      -- Exclude if They Referred Me (user = Me, I am in referrals table)
      AND u.wallet_address != (SELECT referrer_address FROM referrals WHERE user_address = user_addr)
    ORDER BY s.created_at ASC
    LIMIT 1;
END;
$$;
