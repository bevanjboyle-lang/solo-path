-- ADR-025 Employer Tripwire v1 (2026-06-11).
-- Sector-level public-data watch, one per user. The weekly radar digest
-- (send-radar-digest) appends a quiet "Your sector watch" section for users
-- with an active watch. employer_name is stored but NOT watched in v1 —
-- reserved for the v2 employer-level watch.

create table public.tripwire_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  sector text not null,
  employer_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tripwire_watches is
  'ADR-025 Employer Tripwire v1; sector-level public-data watch; employer_name reserved for v2.';

alter table public.tripwire_watches enable row level security;

create policy "tripwire_watches_select_own" on public.tripwire_watches
  for select using (auth.uid() = user_id);
create policy "tripwire_watches_insert_own" on public.tripwire_watches
  for insert with check (auth.uid() = user_id);
create policy "tripwire_watches_update_own" on public.tripwire_watches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tripwire_watches_delete_own" on public.tripwire_watches
  for delete using (auth.uid() = user_id);

create or replace function public.tripwire_watches_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_tripwire_watches_updated_at
  before update on public.tripwire_watches
  for each row execute function public.tripwire_watches_set_updated_at();
