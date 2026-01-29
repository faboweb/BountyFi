-- Add donator fields to campaigns
ALTER TABLE campaigns ADD COLUMN donator_id UUID REFERENCES auth.users(id);
ALTER TABLE campaigns ADD COLUMN current_pool NUMERIC DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN status TEXT DEFAULT 'ACTIVE'; -- ACTIVE | PAUSED | COMPLETED | DRAW_PENDING

-- Donator Profiles
CREATE TABLE donator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    logo_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Donations
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    donator_id UUID REFERENCES donator_profiles(id),
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'ETH',
    tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE donator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON donator_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON donator_profiles FOR ALL USING (auth.uid() = user_id);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read donations" ON donations FOR SELECT USING (true);
-- Typically restricted insert, but for now allow public read.

-- Function for validators to get tasks
CREATE OR REPLACE FUNCTION get_validator_tasks(v_id UUID)
RETURNS SETOF submissions
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT *
  FROM submissions
  WHERE status = 'NEEDS_HUMAN_REVIEW'
    AND user_id != v_id
    AND id NOT IN (SELECT submission_id FROM votes WHERE validator_id = v_id)
  ORDER BY created_at ASC;
$$;
