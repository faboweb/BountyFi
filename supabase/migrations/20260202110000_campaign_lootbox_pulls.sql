-- Log each campaign lootbox pull for analytics (who pulled, won or not, which prize).
CREATE TABLE IF NOT EXISTS public.campaign_lootbox_pulls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    won BOOLEAN NOT NULL,
    prize_id UUID REFERENCES public.campaign_prizes(id) ON DELETE SET NULL,
    prize_label TEXT,
    prize_value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_lootbox_pulls_campaign_id ON public.campaign_lootbox_pulls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_lootbox_pulls_user_address ON public.campaign_lootbox_pulls(user_address);

ALTER TABLE public.campaign_lootbox_pulls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read campaign_lootbox_pulls" ON public.campaign_lootbox_pulls FOR SELECT USING (true);
CREATE POLICY "Service role insert campaign_lootbox_pulls" ON public.campaign_lootbox_pulls FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.campaign_lootbox_pulls IS 'One row per campaign lootbox pull; used for analytics and fairness audits.';
