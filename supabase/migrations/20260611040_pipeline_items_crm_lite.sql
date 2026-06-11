-- Pipeline (CRM-lite) v1 — ADR-025 Hands layer (2026-06-11).
-- The standing workspace where a user's Plan B contacts and conversations
-- live, across and beyond the 30-day plan. One row per contact/opportunity.
-- User-owned; full per-user RLS; the frontend reads and writes directly
-- under RLS (no edge function in the path).
-- Applied to production 2026-06-11 via Supabase MCP as pipeline_items_crm_lite.

create table public.pipeline_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strand_label text,
  contact_name text,
  contact_role text,
  contact_company text,
  channel text check (channel in ('direct','platform','visibility','community')),
  status text not null default 'identified'
    check (status in ('identified','drafted','sent','replied','meeting','proposal','won','parked')),
  next_action text,
  next_action_date date,
  notes text,
  value_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pipeline_items is
  'Pipeline (CRM-lite) v1 per ADR-025: one row per contact/opportunity the user is working across their Plan B strands. channel mirrors the four ADR-007 move types. User-owned, per-user RLS, written directly by the frontend.';

alter table public.pipeline_items enable row level security;

create policy "pipeline_items_select_own" on public.pipeline_items
  for select using (auth.uid() = user_id);
create policy "pipeline_items_insert_own" on public.pipeline_items
  for insert with check (auth.uid() = user_id);
create policy "pipeline_items_update_own" on public.pipeline_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pipeline_items_delete_own" on public.pipeline_items
  for delete using (auth.uid() = user_id);

create index pipeline_items_user_status_next_idx
  on public.pipeline_items (user_id, status, next_action_date);

-- Keep updated_at honest on every edit.
create or replace function public.touch_pipeline_items_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger trg_pipeline_items_touch
  before update on public.pipeline_items
  for each row execute function public.touch_pipeline_items_updated_at();
