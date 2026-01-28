-- Update the verification trigger to use the production URL
CREATE OR REPLACE FUNCTION handle_new_submission()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://cguqjaoeleifeaxktmwv.supabase.co/functions/v1/verify_submission',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
