-- Opportunity Radar v1 weekly cron (ADR-025, 2026-06-10). Applied to prod via
-- MCP 2026-06-10 (pg_cron job 11, Mondays 07:30 UTC, before the Signal at 08:00).
-- Git-parity copy; idempotent re-application guard included.

do $do$
begin
  if exists (select 1 from cron.job where jobname = 'generate-radar-weekly') then
    perform cron.unschedule('generate-radar-weekly');
  end if;
  perform cron.schedule(
    'generate-radar-weekly',
    '30 7 * * 1',
    $cmd$
  SELECT net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/generate-radar',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"cron": true}'::jsonb
  ) AS request_id;
  $cmd$
  );
end
$do$;
