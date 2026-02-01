-- Migration: Add unique constraint to onchain_id in campaigns table
-- This is required for the indexer's upsert logic (ON CONFLICT (onchain_id))

ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_onchain_id_unique UNIQUE (onchain_id);
