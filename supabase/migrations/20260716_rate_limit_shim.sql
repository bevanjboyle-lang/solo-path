-- C0.10 rate-limit shim (Day Zero, 2026-07-16). APPLIED LIVE the same day via
-- MCP migration day_zero_c010_rate_limit_shim; recorded here per W6 migration
-- discipline. Per-key daily counters with one atomic upsert; SECURITY DEFINER
-- function callable by service_role only. Edge functions key on
-- function-name + caller IP ('global' for cron-only endpoints):
--   generate-report          per-IP/day, default 10  (RATE_LIMIT_GENERATE_REPORT_PER_IP_DAY)
--   parse-cv                 per-IP/day, default 15  (RATE_LIMIT_PARSE_CV_PER_IP_DAY)
--   generate-signal-edition  global/day, default 8   (RATE_LIMIT_SIGNAL_GLOBAL_DAY)
create table if not exists public.rate_limit_counters (
  bucket_key text not null,
  window_start date not null default current_date,
  hits integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_start)
);

alter table public.rate_limit_counters enable row level security;

create or replace function public.consume_rate_limit(p_key text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limit_counters as c (bucket_key, window_start, hits)
  values (p_key, current_date, 1)
  on conflict (bucket_key, window_start)
  do update set hits = c.hits + 1, updated_at = now()
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer) from public;
revoke all on function public.consume_rate_limit(text, integer) from anon;
revoke all on function public.consume_rate_limit(text, integer) from authenticated;
grant execute on function public.consume_rate_limit(text, integer) to service_role;

select cron.schedule(
  'rate-limit-cleanup',
  '20 3 * * 0',
  $$delete from public.rate_limit_counters where window_start < current_date - 7$$
);
