-- Table to collect high-quality labels from Vision LLM for future model training
CREATE TABLE IF NOT EXISTS verification_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES submissions(id),
    image_url TEXT NOT NULL,
    state_type TEXT NOT NULL, -- 'BEFORE' or 'AFTER'
    suggested_label TEXT NOT NULL,
    clip_score NUMERIC NOT NULL,
    model_version TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for future harvesting
CREATE INDEX IF NOT EXISTS idx_verification_data_label ON verification_data(suggested_label);
