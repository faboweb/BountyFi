-- Migration: Fix donations schema to include missing fields and donator_address
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS donator_address TEXT;

-- Index for wallet lookup
CREATE INDEX IF NOT EXISTS idx_donations_donator_address ON public.donations(donator_address);
