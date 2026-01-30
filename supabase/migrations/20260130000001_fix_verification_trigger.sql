-- Migration: Fix Verification Trigger to wait for onchain_id
-- Relayed submissions start with onchain_id = NULL. Verification requires onchain_id.

DROP TRIGGER IF EXISTS on_submission_created ON submissions;

CREATE OR REPLACE FUNCTION handle_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if onchain_id is present
  IF NEW.onchain_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent double firing if status is already beyond start (optimization)
  -- But we must ensure it fires once onchain_id is set.
  -- If TG_OP updates onchain_id from NULL to X, fire.
  
  PERFORM
    net.http_post(
      url := 'https://cguqjaoeleifeaxktmwv.supabase.co/functions/v1/verify_submission',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_submission_ready
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_submission();
