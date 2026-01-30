-- Enable pg_cron
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule the Golden Task Injection
-- Runs every hour (0 * * * *)
-- Calls the Edge Function via pg_net (POST)
select cron.schedule(
    'inject-golden-task',
    '0 * * * *',
    $$
    select
        net.http_post(
            url:='https://cguqjaoeleifeaxktmwv.supabase.co/functions/v1/inject_golden_task',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;
    $$
);
