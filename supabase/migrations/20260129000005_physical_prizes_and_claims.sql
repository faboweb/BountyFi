-- Support for physical prizes
ALTER TABLE donations ADD COLUMN donation_type TEXT DEFAULT 'CASH'; -- CASH | ITEM | VOUCHER
ALTER TABLE donations ADD COLUMN description TEXT;

-- Updates to prize_draws for redemption
ALTER TABLE prize_draws ADD COLUMN redemption_code UUID DEFAULT gen_random_uuid();
ALTER TABLE prize_draws ADD COLUMN redeemed_at TIMESTAMPTZ;
ALTER TABLE prize_draws ADD COLUMN merchant_id UUID REFERENCES auth.users(id);

-- Campaigns prize type
ALTER TABLE campaigns ADD COLUMN prize_type TEXT DEFAULT 'CASH'; -- CASH | ITEM
ALTER TABLE campaigns ADD COLUMN prize_description TEXT;
