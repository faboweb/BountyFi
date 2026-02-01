-- RPC to get current user's referral code (wallet address) and count of referrals
-- Replaces GET /rest/v1/referrals/my-code

CREATE OR REPLACE FUNCTION get_my_referral_code()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet TEXT;
    v_count INTEGER;
BEGIN
    -- 1. Get current user's wallet address from auth.users or context
    -- Since we use ensure_user and have custom auth, we might rely on a header or param?
    -- Actually, for RPC calls from authenticated client, auth.uid() is the UUID.
    -- We need to look up the wallet address from the public.users table using auth.uid()
    -- OR if using our custom auth scheme where we pass wallet address...
    -- But client.ts sends 'Authorization: Bearer <token>' which is usually the toggle.
    -- If using strict Supabase Auth, auth.uid() works. 
    -- If using custom 'verify_coinbase_token', we session.user_id is set.
    
    SELECT wallet_address INTO v_wallet
    FROM users
    WHERE id = auth.uid();

    -- Fallback: if v_wallet is null (maybe anon or issue), try to find from context? 
    -- For now, if null, return error or empty.
    
    IF v_wallet IS NULL THEN
        -- If we can't identify user, return empty/zero
        RETURN json_build_object(
            'code', '',
            'referrals_count', 0
        );
    END IF;

    -- 2. Count referrals
    SELECT COUNT(*) INTO v_count
    FROM referrals
    WHERE referrer_address = v_wallet;

    -- 3. Return JSON
    -- We use the wallet address as the referral code for now
    RETURN json_build_object(
        'code', v_wallet,
        'referrals_count', v_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_referral_code() TO authenticated;
