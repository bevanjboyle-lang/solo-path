-- Phase D (Move 4): the living dossier's weekly pulse.
--
-- report_evidence_refresh is APPEND-ONLY relative to reports.core_report:
-- the Monday heartbeat re-runs the deterministic evidence attach against
-- fresh radar_items and writes the result here, one row per (report, week).
-- core_report is never mutated after generation; the frontend overlays the
-- latest refresh row when one exists. This is what "your dossier stays
-- live" means mechanically.
--
-- heartbeat (nullable) carries the per-user weekly note for users with an
-- active tracker: radar matches for their focus strands plus one market
-- movement sentence. The weekly friction review (separate table, Monday
-- 08:00) already covers "your week reviewed" and "next week's focus"; the
-- two cards compose on /plan rather than duplicating each other.

create table if not exists public.report_evidence_refresh (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  week_start date not null,
  evidence_by_option jsonb not null default '{}'::jsonb,
  heartbeat jsonb,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, week_start)
);

create index if not exists idx_evidence_refresh_report_week
  on public.report_evidence_refresh (report_id, week_start desc);

alter table public.report_evidence_refresh enable row level security;

-- Users may read refresh rows for reports they own. Writes are service-role
-- only (the weekly-heartbeat function); no insert/update/delete policies.
create policy "Users read own evidence refreshes"
  on public.report_evidence_refresh
  for select
  to authenticated
  using (
    exists (
      select 1 from public.reports r
      where r.id = report_id and r.user_id = auth.uid()
    )
  );
