-- Migration: Relayed Submissions & Golden Tasks
-- Adding fields to store off-chain proofs and Golden Task metadata

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS submission_hash TEXT,
ADD COLUMN IF NOT EXISTS is_golden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expected_outcome TEXT, -- 'APPROVE' | 'REJECT'
ADD COLUMN IF NOT EXISTS golden_content JSONB; -- Store fake data if needed (mismatches)

-- Ensure submission_hash is unique to prevent replay attacks (though collision unlikely with good hash)
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_submission_hash ON submissions(submission_hash);

-- Update RLS to allow Relayer (Service Role) to manage these, 
-- and Validators to read 'golden_content' if they are blindly validating? 
-- Actually validators see the 'photo_urls' which for Golden Tasks are populated with the golden content.
-- So `golden_content` might just be metadata for the Agent to know WAS injected.
-- The actual `photo_urls` should be populated with the fake data.

-- Grant access to service role (default, but good to be explicit if restrictive)
-- GRANT ALL ON submissions TO service_role;
