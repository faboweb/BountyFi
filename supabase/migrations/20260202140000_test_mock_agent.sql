-- Test-only mock agent: when test_mock_agent=true, verify_submission skips AI and chain.
-- Only test scripts set this; production submissions never have it.
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS test_mock_agent BOOLEAN DEFAULT false;

-- Trigger: fire when onchain_id is set OR when test_mock_agent (for tests without chain)
CREATE OR REPLACE FUNCTION handle_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onchain_id IS NOT NULL OR (NEW.test_mock_agent = true) THEN
    PERFORM
      net.http_post(
        url := 'https://cguqjaoeleifeaxktmwv.supabase.co/functions/v1/verify_submission',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object('record', row_to_json(NEW))
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
