-- Add Coinbase ID to users for mapping
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coinbase_id TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
