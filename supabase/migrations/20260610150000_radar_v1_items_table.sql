-- Opportunity Radar v1 (ADR-025, 2026-06-10). Applied to prod via MCP 2026-06-10
-- as migration radar_v1_items_table; this file is the git-parity copy.
-- Weekly per-category radar items. Service-role writes only (V-072 pattern);
-- authenticated users read. Items are real sourced opportunities ('tender')
-- or clearly-labelled Solo analysis ('analysis').

create table public.radar_items (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  category text not null, -- kb_archetypes.category value, or 'General'
  source_type text not null check (source_type in ('tender','analysis')),
  title text not null,
  summary text not null, -- the "why this matters for you" line, Solo voice
  url text,
  source_name text,
  buyer text,
  value_text text, -- e.g. '£55,000' (display string; amounts vary in shape)
  deadline timestamptz,
  relevance_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.radar_items is 'Opportunity Radar v1 (ADR-025): weekly market openings per archetype category. Written by generate-radar (service role); read by get-radar.';
comment on column public.radar_items.category is 'Matches kb_archetypes.category; ''General'' = cross-domain items shown to everyone.';
comment on column public.radar_items.source_type is 'tender = real sourced notice with URL; analysis = Solo''s labelled market read.';

create unique index radar_items_week_title_uniq on public.radar_items (week_start, category, title);
create index radar_items_category_week_idx on public.radar_items (category, week_start desc);

alter table public.radar_items enable row level security;

create policy "radar_items_select_authenticated"
  on public.radar_items for select
  to authenticated
  using (true);
-- No insert/update/delete policies: service-role only (V-072 implicit pattern).
