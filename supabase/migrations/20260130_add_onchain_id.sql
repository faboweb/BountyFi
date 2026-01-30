-- Add onchain_id column to submissions table to map to Smart Contract IDs
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS onchain_id BIGINT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_onchain_id ON submissions(onchain_id);
CREATE INDEX IF NOT EXISTS idx_submissions_photo_hash ON submissions(photo_hash);
