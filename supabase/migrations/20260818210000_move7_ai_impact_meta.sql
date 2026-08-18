-- Move 7 (corpus pipeline): quarterly AI-impact regeneration support.
--
-- 1. Snapshot the hand-era corpus before the first generated pass, for
--    rollback and for the human spot-audit diff (June R4 recommendation).
-- 2. Add meta jsonb to kb_ai_impact so every generated row carries its
--    provenance (generated_at, model, prompt_version, grounding counts).
--    Hand-written rows keep meta null; that absence is itself the marker
--    of the pre-pipeline era.

create table if not exists public.kb_ai_impact_archive_2026_05 as
  select * from public.kb_ai_impact;

alter table public.kb_ai_impact add column if not exists meta jsonb;
