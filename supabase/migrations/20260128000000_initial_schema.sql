-- Enable UUID extension (not strictly needed for gen_random_uuid in PG13+, but good for legacy)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Tables

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  rules TEXT,
  prize_pool NUMERIC,
  deadline TIMESTAMPTZ,
  checkpoints JSONB, -- [{lat, lng, radius, name}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  photo_urls TEXT[], -- Supabase Storage URLs
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  status TEXT DEFAULT 'PENDING', -- PENDING | AUTO_APPROVE | AUTO_REJECT | NEEDS_HUMAN_REVIEW | APPROVED | REJECTED
  verification_trace JSONB, -- Agent steps log
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE validators (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  validations_today INT DEFAULT 0,
  total_validations INT DEFAULT 0,
  tickets_earned INT DEFAULT 0,
  accuracy_score NUMERIC DEFAULT 1.0
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id),
  validator_id UUID REFERENCES auth.users(id),
  decision TEXT, -- APPROVE | REJECT | UNCLEAR
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, validator_id)
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  amount INT NOT NULL,
  source TEXT, -- 'submission' | 'validation' | 'bonus'
  tx_hash TEXT, -- Base blockchain tx (if minted on-chain)
  submission_hash TEXT, -- Anchor hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON campaigns FOR SELECT USING (true);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own submissions" ON submissions FOR SELECT USING (auth.uid() = user_id);
-- Validators need to see pending submissions (filtered by app logic, but row level allows seeing them)
CREATE POLICY "Validators can read pending submissions" ON submissions FOR SELECT USING (status = 'PENDING' OR status = 'NEEDS_HUMAN_REVIEW'); 
CREATE POLICY "Users can insert own submissions" ON submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE validators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read validators" ON validators FOR SELECT USING (true);
CREATE POLICY "Users can update own validator stats" ON validators FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Validators can insert votes" ON votes FOR INSERT WITH CHECK (auth.uid() = validator_id);
CREATE POLICY "Validators can read votes" ON votes FOR SELECT USING (true);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own tickets" ON tickets FOR SELECT USING (auth.uid() = user_id);

-- Storage Buckets (configuration usually handled via interface, but policies here)
-- We assume 'submission-photos' bucket exists.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('submission-photos', 'submission-photos', true);

-- Storage Policies (pseudo-code, needs to be applied to storage.objects)
-- CREATE POLICY "Public read photos" ON storage.objects FOR SELECT USING (bucket_id = 'submission-photos');
-- CREATE POLICY "Users upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submission-photos' AND auth.uid() = owner);
