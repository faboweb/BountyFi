-- Prize Draws / Claims
CREATE TABLE prize_draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    campaign_id UUID REFERENCES campaigns(id),
    tx_hash TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING | WON | LOST | FAILED
    prize_amount NUMERIC,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for prize draws
ALTER TABLE prize_draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own draws" ON prize_draws FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own draws" ON prize_draws FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add unique constraint to users for wallet_address if not exists
-- This is often useful for joins during sync
-- ALTER TABLE users ADD CONSTRAINT unique_wallet UNIQUE (wallet_address);
