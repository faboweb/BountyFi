-- Add Campaign Types
DO $$ BEGIN
    CREATE TYPE campaign_type AS ENUM ('simple', 'action', 'check_in');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type campaign_type DEFAULT 'action';

-- Create public.users table if not exists to store enrollment and metadata
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  wallet_address TEXT UNIQUE,
  enrollment_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/update own profile" ON public.users 
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Public read handles" ON public.users FOR SELECT USING (true);
