-- Add Facilitator/Referral tracking
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS facilitator_id UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS facilitator_pending_tickets INTEGER DEFAULT 0;
