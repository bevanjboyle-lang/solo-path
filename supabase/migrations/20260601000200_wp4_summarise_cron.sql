-- Applied directly via cron.schedule in the WP4 wiring session (job 10).
select cron.schedule(
  'summarise-old-checkins-nightly',
  '0 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/summarise-old-checkins',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"cron": true}'::jsonb
  ) AS request_id;
  $cron$
);
