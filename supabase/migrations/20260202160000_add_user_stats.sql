-- Migration: Add user stats (name, streak)
-- Description: Adds 'name' and 'streak' columns to the 'users' table to support profile stats display.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;

-- Grant access to authenticated users (and anon if needed for public profiles, but usually users read their own)
-- Since 'users' already exists and likely has policies, we rely on existing SELECT policies.
-- If 'users' table policies are restricted to own-row only, that matches our need (viewing own stats).
