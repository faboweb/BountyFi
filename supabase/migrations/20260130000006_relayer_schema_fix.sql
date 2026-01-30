-- Migration: Schema gaps for Relayer/UI binding
-- Add onchain_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS onchain_id INTEGER;

-- Add tickets and diamonds cache to users if not present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tickets INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS diamonds INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE;

-- Ensure RLS allows the service role (default is yes, but let's be safe)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role managed" ON public.users;
CREATE POLICY "Service role managed" ON public.users FOR ALL USING (true);
