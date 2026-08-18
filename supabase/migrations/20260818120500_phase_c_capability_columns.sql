-- Phase C (blueprint Moves 1+2, 2026-08-18): capability join foundations.
-- Applied live via MCP apply_migration on 2026-08-18; this file is the
-- source-of-record copy.
--
-- kb_models gains its category (16 domains, previously JSON-only) and the
-- curated capability_requirements (5-6 tags with importance, backfilled from
-- knowledge-bank/business_models.json on 2026-08-18 - 480/480 rows, slim
-- shape [{"capability": slug, "importance": critical|important|helpful}]).
--
-- kb_archetypes gains a generated capability_vector (all 33 capability slugs
-- rated strong/present/none) produced by the
-- admin-generate-archetype-capabilities batch function (gpt-5.4-mini,
-- calibrated against the hand grid: 0.97 avg critical coverage, 0 archetypes
-- below 0.7) plus capability_vector_meta for provenance. The hand kb_mapping
-- table remains the veto-and-boost layer; avoid rows are law.
alter table public.kb_models
  add column if not exists category text,
  add column if not exists capability_requirements jsonb;
alter table public.kb_archetypes
  add column if not exists capability_vector jsonb,
  add column if not exists capability_vector_meta jsonb;
