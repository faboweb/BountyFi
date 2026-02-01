-- Allow app to save campaigns: RLS INSERT policy + columns used by StartCampaignScreen

-- Columns used by CreateCampaignRequest (app sends these; DB had prize_pool/deadline only)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS prize_total NUMERIC;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS min_funding_thb INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS requires_face_recognition BOOLEAN DEFAULT FALSE;

-- Backfill prize_total from prize_pool where missing (optional)
UPDATE public.campaigns SET prize_total = prize_pool WHERE prize_total IS NULL AND prize_pool IS NOT NULL;
UPDATE public.campaigns SET end_date = deadline WHERE end_date IS NULL AND deadline IS NOT NULL;

-- Allow authenticated users to insert campaigns (so "Donate & launch campaign" persists)
CREATE POLICY "Allow authenticated users to insert campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
