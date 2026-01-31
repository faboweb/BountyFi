-- Migration: Wallet Earnings and Leaderboard (Refined)
-- Create a view for the leaderboard based on the cached tickets in public.users
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  id as user_id,
  email,
  wallet_address,
  tickets,
  RANK() OVER (ORDER BY tickets DESC) as rank
FROM public.users
WHERE tickets > 0 OR diamonds > 0;

-- Function to calculate earnings in the last 24 hours for a user
CREATE OR REPLACE FUNCTION get_earnings_24h(v_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total
    FROM tickets
    WHERE user_id = v_user_id
      AND created_at > NOW() - INTERVAL '24 hours';
    RETURN total;
END;
$$;

-- Grant access to the view and function
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;
GRANT EXECUTE ON FUNCTION get_earnings_24h(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_earnings_24h(UUID) TO anon;
