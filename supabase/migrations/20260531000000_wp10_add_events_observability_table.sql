-- WP10 observability: a generic, append-only event log.
-- Applied to production 2026-05-31 via MCP apply_migration (name: wp10_add_events_observability_table).
-- This file is the git-committable copy (W6 migration discipline).
-- Closes the gap flagged in Track A diagnostics (A1/A3/A4): no place to record
-- tracker_activated, quality_failure, and similar production events.
-- Append-only by design: report_id is a SOFT reference (no FK) so events survive
-- entity deletion and the log stays immutable. Service-role-only access
-- (RLS enabled, no policies) per the V-072 pattern (CLAUDE.md §4).

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  report_id uuid,
  client_session_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.events is 'Append-only production event log (WP10 observability). Service-role write/read only. report_id is a soft reference (no FK) to keep the log immutable across entity deletion.';
comment on column public.events.event_type is 'Event name, e.g. tracker_activated, quality_failure, plan_generated, second_report_claimed.';
comment on column public.events.user_id is 'Optional FK to auth.users; null for anonymous-stage events.';
comment on column public.events.report_id is 'Soft reference to public.reports(id); intentionally not a FK so events outlive deleted reports.';
comment on column public.events.client_session_id is 'Anon client session id for events fired before a user exists.';
comment on column public.events.payload is 'Arbitrary structured event detail.';

create index if not exists events_event_type_created_idx on public.events (event_type, created_at desc);
create index if not exists events_user_id_idx on public.events (user_id) where user_id is not null;
create index if not exists events_report_id_idx on public.events (report_id) where report_id is not null;
create index if not exists events_created_at_idx on public.events (created_at desc);

alter table public.events enable row level security;
-- No policies defined: with RLS enabled this restricts all access to the
-- service-role key (V-072 implicit service-role-only-writes pattern).
