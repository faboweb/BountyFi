-- Prizes: label, image, sponsor, amount, value (no emoji/trophy/medal)
ALTER TABLE public.campaign_prizes ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.campaign_prizes ADD COLUMN IF NOT EXISTS sponsor TEXT;
