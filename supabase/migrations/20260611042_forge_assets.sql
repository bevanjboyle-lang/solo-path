-- Asset Forge v1 (ADR-025 'Hands' layer, built 2026-06-11).
-- Generated collateral personalised from the user's paid report:
-- positioning one-pager, rate card, LinkedIn About section.
-- Written by the generate-asset edge function (service role); the owning
-- user reads/manages rows directly under per-user RLS.

create table public.forge_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type in ('one_pager','rate_card','linkedin_about')),
  title text not null,
  content_md text not null,
  source_report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.forge_assets is
  'Asset Forge v1 (ADR-025): generated collateral (positioning one-pager, rate card, LinkedIn About) personalised from the user''s paid report. Inserted by generate-asset (service role); owned and read by the user under per-user RLS.';

alter table public.forge_assets enable row level security;

create policy "forge_assets_select_own" on public.forge_assets
  for select using (auth.uid() = user_id);
create policy "forge_assets_insert_own" on public.forge_assets
  for insert with check (auth.uid() = user_id);
create policy "forge_assets_update_own" on public.forge_assets
  for update using (auth.uid() = user_id);
create policy "forge_assets_delete_own" on public.forge_assets
  for delete using (auth.uid() = user_id);

create index forge_assets_user_type_idx
  on public.forge_assets (user_id, asset_type, created_at desc);
