-- Migration: Align campaigns table with frontend and on-chain needs
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS quest_type TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS prize_total BIGINT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS min_funding_thb BIGINT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS requires_face_recognition BOOLEAN DEFAULT FALSE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS checkpoints JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS prize_chest JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS sponsors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- Ensure existing columns have sensible defaults if they are NULL
UPDATE public.campaigns SET reward_amount = 0 WHERE reward_amount IS NULL;
UPDATE public.campaigns SET stake_amount = 0 WHERE stake_amount IS NULL;
UPDATE public.campaigns SET radius_m = 0 WHERE radius_m IS NULL;
UPDATE public.campaigns SET ai_threshold = 0 WHERE ai_threshold IS NULL;
UPDATE public.campaigns SET campaign_type = 'SINGLE_PHOTO' WHERE campaign_type IS NULL;

-- Add index for tx_hash to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_campaigns_tx_hash ON public.campaigns(tx_hash);
