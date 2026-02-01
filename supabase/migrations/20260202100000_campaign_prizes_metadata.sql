-- Prizes with EIP-712 metadata: stored in DB first, added to chain by donator (not bot)
-- hash = EIP-712 typed data hash; amount/value = prize terms; eip712_metadata = full typed data for verification
CREATE TABLE IF NOT EXISTS public.campaign_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    donator_id UUID REFERENCES auth.users(id),
    donator_address TEXT,
    metadata_hash TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    value NUMERIC NOT NULL,
    eip712_metadata JSONB,
    label TEXT,
    emoji TEXT,
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_prizes_campaign_id ON public.campaign_prizes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_prizes_metadata_hash ON public.campaign_prizes(metadata_hash);
CREATE INDEX IF NOT EXISTS idx_campaign_prizes_tx_hash ON public.campaign_prizes(tx_hash);

ALTER TABLE public.campaign_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read campaign_prizes" ON public.campaign_prizes FOR SELECT USING (true);
CREATE POLICY "Authenticated insert campaign_prizes" ON public.campaign_prizes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role update campaign_prizes" ON public.campaign_prizes FOR UPDATE USING (true);

COMMENT ON TABLE public.campaign_prizes IS 'Prize metadata (EIP-712 hash, amount, value) stored in DB; donator adds to chain via addPrize tx';
