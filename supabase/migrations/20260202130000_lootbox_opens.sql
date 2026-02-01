-- Indexed lootbox opens: request_id from chain, user_address, prize_tier, prize_label for display in app.
CREATE TABLE IF NOT EXISTS public.lootbox_opens (
    request_id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    campaign_id TEXT, -- null = monthly lootbox; uuid = campaign-specific
    onchain_campaign_id NUMERIC, -- chain campaign id (type(uint256).max = monthly)
    prize_tier INTEGER NOT NULL, -- monthly: 1=common, 2=uncommon, 3=rare; campaign: 0=none, 1..n=prize index
    prize_label TEXT, -- resolved for display, e.g. "Common", "Uncommon", "Rare" or campaign prize label
    fulfilled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lootbox_opens_user_address ON public.lootbox_opens(user_address);
CREATE INDEX IF NOT EXISTS idx_lootbox_opens_fulfilled ON public.lootbox_opens(fulfilled);

ALTER TABLE public.lootbox_opens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lootbox_opens" ON public.lootbox_opens FOR SELECT USING (true);
CREATE POLICY "Service role insert lootbox_opens" ON public.lootbox_opens FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role update lootbox_opens" ON public.lootbox_opens FOR UPDATE USING (true);

COMMENT ON TABLE public.lootbox_opens IS 'Indexed LootboxOpened / requests() from Lootbox contract; prize_label for app display.';
