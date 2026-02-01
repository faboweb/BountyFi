-- Migration: Change donator_id from UUID to TEXT (wallet address)
-- This aligns with the "decouple auth" strategy and the user's feedback.

-- 1. Update donations table
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_donator_id_fkey;
ALTER TABLE public.donations ALTER COLUMN donator_id TYPE TEXT USING donator_id::text;

-- 2. Update campaigns table
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_donator_id_fkey;
ALTER TABLE public.campaigns ALTER COLUMN donator_id TYPE TEXT USING donator_id::text;

-- 3. Update campaign_prizes table (if it exists)
ALTER TABLE public.campaign_prizes DROP CONSTRAINT IF EXISTS campaign_prizes_donator_id_fkey;
ALTER TABLE public.campaign_prizes ALTER COLUMN donator_id TYPE TEXT USING donator_id::text;

-- Update Edge Function was already using donator_id as a string from the request,
-- but my previous "sanitization" prevented wallet addresses from being saved.
