-- C1.2 diagnostic nurture drip — own-stack implementation (2026-07-18).
-- Beehiiv automations sit behind the Scale plan; the approved five-email
-- sequence runs from our own infrastructure instead: this table + a daily
-- pg_cron + the send-nurture-emails edge function. Exit-on-purchase is
-- automatic (nurture_exit_check joins auth.users → reports), unsubscribes and
-- frequency caps ride the existing ADR-027 machinery (can_send_email /
-- email_suppressions / manage-unsubscribe).

create table if not exists public.diagnostic_nurture (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  read_snapshot text,
  sector text,
  seniority text,
  work_type text,
  emails_sent int not null default 0,
  status text not null default 'active'
    check (status in ('active','completed','exited_purchase','suppressed','error_paused')),
  captured_at timestamptz not null default now(),
  last_sent_at timestamptz,
  next_send_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists diagnostic_nurture_email_uidx
  on public.diagnostic_nurture (lower(email));

alter table public.diagnostic_nurture enable row level security;
-- No policies on purpose: service-role only (same posture as events).

-- Purchase detection for the exit condition. SECURITY DEFINER because it
-- reads auth.users; service-role callers only.
create or replace function public.nurture_exit_check(p_email text)
returns table(purchased boolean, found_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  select u.id into v_uid
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_uid is null then
    return query select false, null::uuid;
    return;
  end if;

  return query select exists(
    select 1 from public.reports r
    where r.user_id = v_uid
      and r.status in ('pending_selection','generating_plan','complete')
  ), v_uid;
end;
$$;

revoke all on function public.nurture_exit_check(text) from public;
revoke all on function public.nurture_exit_check(text) from anon;
revoke all on function public.nurture_exit_check(text) from authenticated;

-- Daily drip at 08:10 UTC (house 8am-UTC convention, after the Monday 08:00
-- Signal job). Email 1 is sent at capture by subscribe-signal v5; this cron
-- delivers steps 2-5 and retries anything deferred.
do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'diagnostic-nurture-daily') then
    perform cron.schedule(
      'diagnostic-nurture-daily',
      '10 8 * * *',
      $cmd$
  SELECT net.http_post(
    url := 'https://dnnxmjazillhktwttkux.supabase.co/functions/v1/send-nurture-emails',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"cron": true}'::jsonb
  ) AS request_id;
 $cmd$
    );
  end if;
end
$do$;
