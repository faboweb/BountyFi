-- BountyFi v2 Schema

-- Campaigns (Mirrors on-chain state)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Ensure columns exist if table was already created
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS reward_amount BIGINT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS stake_amount BIGINT;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS radius_m INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS ai_threshold INTEGER;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;


-- Submissions (Mirrors on-chain state + extra metadata)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.campaigns(id),
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

-- Ensure columns exist if table was already created
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id);
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS submitter_address TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS photo_hash TEXT;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS ai_confidence INTEGER;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS approve_votes INTEGER DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS reject_votes INTEGER DEFAULT 0;
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS tx_hash TEXT;


-- AI Verdicts (Oracle traces)
CREATE TABLE IF NOT EXISTS public.ai_verdicts (
    submission_id UUID PRIMARY KEY REFERENCES public.submissions(id),
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
DROP POLICY IF EXISTS "Allow public read-only access to campaigns" ON public.campaigns;
CREATE POLICY "Allow public read-only access to campaigns" ON public.campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to read submissions" ON public.submissions;
CREATE POLICY "Allow users to read submissions" ON public.submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create submissions" ON public.submissions;
CREATE POLICY "Allow authenticated users to create submissions" ON public.submissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage Bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT DO NOTHING;
