-- BountyFi v2 Schema

-- Campaigns (Mirrors on-chain state)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL, -- SINGLE_PHOTO, TWO_PHOTO_CHANGE, CHECKIN_SELFIE
    reward_amount BIGINT NOT NULL,
    stake_amount BIGINT NOT NULL,
    radius_m INTEGER NOT NULL,
    ai_threshold INTEGER NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Submissions (Mirrors on-chain state + extra metadata)
CREATE TABLE IF NOT EXISTS public.submissions (
    id BIGINT PRIMARY KEY,
    campaign_id BIGINT REFERENCES public.campaigns(id),
    submitter_address TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    photo_hash TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    status TEXT NOT NULL, -- PENDING, AI_VERIFIED, JURY_VOTING, REJECTED, APPROVED
    ai_confidence INTEGER,
    approve_votes INTEGER DEFAULT 0,
    reject_votes INTEGER DEFAULT 0,
    tx_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- AI Verdicts (Oracle traces)
CREATE TABLE IF NOT EXISTS public.ai_verdicts (
    submission_id BIGINT PRIMARY KEY REFERENCES public.submissions(id),
    model TEXT,
    results JSONB,
    confidence INTEGER,
    trace JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_verdicts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read-only access to campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Allow users to read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to create submissions" ON public.submissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage Bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT DO NOTHING;
