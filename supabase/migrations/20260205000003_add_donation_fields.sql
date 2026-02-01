-- Migration: Add image_url and quantity to donations
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS token_address TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS token_symbol TEXT DEFAULT 'USDC';
