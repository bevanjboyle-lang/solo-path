-- C1.3 weekly content loop + C0.5 funnel digest (2026-07-18).
-- content_batches stores each Monday's generated LinkedIn/Reddit batch for
-- Bevan's single approval session; two new crons drive the Monday rhythm:
--   07:45 send-funnel-digest      (last-7-days funnel numbers to the owner)
--   08:30 generate-content-batch  (after the 08:00 Signal edition publishes)

create table if not exists public.content_batches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid references public.signal_editions(id),
  batch jsonb not null,
  status text not null default 'draft' check (status in ('draft','approved','posted','discarded')),
  created_at timestamptz not null default now()
);

create unique index if not exists content_batches_edition_uidx
  on public.content_batches (edition_id);

alter table public.content_batches enable row level security;
-- No policies on purpose: service-role only.

do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'send-funnel-digest-monday') then
    perform cron.schedule(
      'send-funnel-digest-monday',
      '45 7 * * 1',
      $cmd$
  SELECT net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/send-funnel-digest',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"cron": true}'::jsonb
  ) AS request_id;
 $cmd$
    );
  end if;
  if not exists (select 1 from cron.job where jobname = 'generate-content-batch-monday') then
    perform cron.schedule(
      'generate-content-batch-monday',
      '30 8 * * 1',
      $cmd$
  SELECT net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/generate-content-batch',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"cron": true}'::jsonb
  ) AS request_id;
 $cmd$
    );
  end if;
end
$do$;
