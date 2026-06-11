-- asked_this_week — ADR-025 Peers layer (2026-06-11).
-- Curated, fully-anonymised Ask Solo question themes + answer summaries,
-- populated weekly by the generate-asked-this-week edge function once
-- Ask Solo volume crosses the privacy floor (>= 5 distinct users in the
-- window; below that nothing is ever published). Service-role writes only;
-- authenticated users read.

create table public.asked_this_week (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  question_theme text not null,
  answer_summary text not null,
  created_at timestamptz not null default now(),
  unique (week_start, question_theme)
);

comment on table public.asked_this_week is
  'ADR-025 Peers layer. Curated fully-anonymised Ask Solo themes (never quotes, never identifying specifics); populated weekly by generate-asked-this-week once volume exists (privacy floor: 5 distinct users). Service-role writes; authenticated SELECT.';

alter table public.asked_this_week enable row level security;

create policy "Authenticated users can read asked this week"
  on public.asked_this_week
  for select
  to authenticated
  using (true);
