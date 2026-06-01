-- WP9 — Prompt A/B testing infrastructure (scaffolding only). Design: admin/wp9-ab-testing-design-2026-05-31.md.
create table if not exists public.experiments (
  experiment_id uuid primary key default gen_random_uuid(),
  prompt_id text not null,
  variant_a_hash text not null,
  variant_b_hash text not null,
  allocation_percentage integer not null default 50 check (allocation_percentage between 0 and 100),
  primary_metric text not null check (primary_metric in (
    'teaser_to_paywall_conversion','paywall_to_subscription_conversion',
    'first_move_outcome_captured_within_72h','tracker_day_7_retention')),
  status text not null default 'draft' check (status in ('draft','running','stopped')),
  started_at timestamptz, ended_at timestamptz, notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists experiments_one_running_per_prompt
  on public.experiments (prompt_id) where status = 'running';
alter table public.experiments enable row level security;

alter table public.reports add column if not exists prompt_variant_assignments jsonb;

create or replace function public.assign_ab_variant(p_user_id uuid, p_experiment_id uuid, p_allocation_pct integer)
returns text language sql immutable as $$
  select case
    when (('x' || substr(md5(coalesce(p_user_id::text,'') || ':' || p_experiment_id::text), 1, 8))::bit(32)::bigint % 100) < p_allocation_pct
    then 'variant_b' else 'variant_a' end;
$$;
revoke execute on function public.assign_ab_variant(uuid, uuid, integer) from anon, authenticated;

create or replace view public.ab_experiment_arm_counts as
select e.experiment_id, e.prompt_id, e.primary_metric, e.status, ra.variant, count(*) as reports_assigned
from public.experiments e
join lateral (
  select r.prompt_variant_assignments ->> e.prompt_id as variant
  from public.reports r where r.prompt_variant_assignments ? e.prompt_id
) ra on true
group by e.experiment_id, e.prompt_id, e.primary_metric, e.status, ra.variant;
