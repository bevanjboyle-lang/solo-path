-- Progress Ledger (ADR-025, 2026-06-11). Hands layer: user-recorded milestones
-- (proposals, replies, meetings, wins, income) shown as a quiet editorial
-- section on /plan. User-owned table: all CRUD direct from the client under RLS.
-- Applied live via Supabase MCP as migration `progress_ledger_entries` on 2026-06-11.

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('proposal_sent','first_reply','first_meeting','first_win','income')),
  label text not null,
  amount_text text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

comment on table public.ledger_entries is
  'Progress Ledger (ADR-025, 2026-06-11): user-recorded milestones (proposal_sent, first_reply, first_meeting, first_win, income) surfaced on /plan. Per-user RLS; client CRUD.';

alter table public.ledger_entries enable row level security;

create policy "ledger_entries_select_own" on public.ledger_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "ledger_entries_insert_own" on public.ledger_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "ledger_entries_update_own" on public.ledger_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ledger_entries_delete_own" on public.ledger_entries
  for delete to authenticated using (auth.uid() = user_id);

create index ledger_entries_user_occurred_idx on public.ledger_entries (user_id, occurred_on desc, created_at desc);
