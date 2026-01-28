-- Trigger verification when a new submission is created
CREATE OR REPLACE FUNCTION handle_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- We use the native supabase_functions schema to call the edge function
  -- In local dev, we use the internal URL. In production, we'd use the project URL.
  -- For hackathon demo simplicity, we'll use a webhook if available, or just log for now
  -- but let's try to actually call it.
  
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

CREATE TRIGGER on_submission_created
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_submission();
