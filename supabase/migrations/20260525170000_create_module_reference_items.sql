-- Create module_reference_items table for the guidance enrichment workstream.
--
-- Per admin/guidance-schema-v1-design.md (Phase A) and admin/guidance-enrichment-workstream-plan.md.
-- This is the canonical home for curated reference content (templates, links,
-- comparisons, checklists, questions-to-ask, calendars) that the redesigned
-- guidance modules surface in their reference layer.
--
-- N:N to modules is handled via the applicable_module_ids integer array
-- (GIN-indexed) rather than a junction table per Q1b locked decision.
--
-- RLS: authenticated + anon SELECT (anon allowed because reference items will
-- eventually surface on pre-conversion screens; safer to permit now than
-- retrofit). Writes are service-role-only by omission per the V-072
-- implicit-service-role-only-writes pattern.

create table public.module_reference_items (
  id              bigserial primary key,
  content_type    text not null
                  check (content_type in
                    ('template', 'link', 'comparison', 'checklist', 'questions', 'calendar')),
  title           text not null,
  one_line_description text not null,
  inline_content  text,
  external_url    text,
  verified_date   date not null default current_date,
  verified_by     text not null default 'solo-team',
  applicable_module_ids  integer[] not null default '{}'::integer[],
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint module_reference_items_has_content
    check (inline_content is not null or external_url is not null)
);

create index module_reference_items_applicable_modules_idx
  on public.module_reference_items using gin (applicable_module_ids);

alter table public.module_reference_items enable row level security;

create policy "module_reference_items_select_authenticated"
  on public.module_reference_items
  for select
  to authenticated
  using (true);

create policy "module_reference_items_select_anon"
  on public.module_reference_items
  for select
  to anon
  using (true);

comment on table public.module_reference_items is
  'Curated reference content for the guidance enrichment workstream. Per admin/guidance-schema-v1-design.md and admin/guidance-enrichment-workstream-plan.md. N:N to modules via applicable_module_ids integer array (GIN-indexed). RLS: authenticated + anon SELECT, service-role-only writes (V-072 pattern).';
