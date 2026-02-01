-- Team Requests Table
CREATE TABLE team_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- RLS
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see requests they sent or received" ON team_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert requests they send" ON team_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests they sent or received" ON team_requests
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
