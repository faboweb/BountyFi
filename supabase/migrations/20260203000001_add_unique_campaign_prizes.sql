-- Add unique constraint to campaign_prizes for indexer upsert
ALTER TABLE public.campaign_prizes 
ADD CONSTRAINT campaign_prizes_campaign_id_label_metadata_hash_key 
UNIQUE (campaign_id, label, metadata_hash);
