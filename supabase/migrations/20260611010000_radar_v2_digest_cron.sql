-- Radar v2 (2026-06-11): weekly radar digest email, Mondays 08:15 UTC,
-- 45 minutes after generate-radar (cron job 11, Mondays 07:30 UTC) so the
-- week's items exist before the digest assembles. Same pg_net pattern as
-- every other cron-called function.
SELECT cron.schedule(
  'send-radar-digest-weekly',
  '15 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/send-radar-digest',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"cron": true}'::jsonb
  ) AS request_id;
  $$
);
