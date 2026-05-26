-- Module 26-32 reference items (Track F Rejection & Resilience).
-- Applied via Supabase MCP apply_migration on 2026-05-25 during autonomous Track-A-to-F authoring sprint.
-- Bundle includes: follow-up message templates for silence, 48-hour acknowledgement templates after a no,
-- decision framework for "should I take the job", peer-comparison response templates by announcement type,
-- partner conversation structure templates by relationship dynamic.
-- 5 items inserted into public.module_reference_items.
--
-- Track F items are templates and scripts rather than reference content; lower regulatory risk than Tracks A-E
-- but still carry "if chronic, see coach or therapist" caveats where relevant.
--
-- To re-export for a fresh DB rebuild, run:
--   SELECT * FROM public.module_reference_items WHERE applicable_module_ids && ARRAY[26,27,28,29,30,31,32];

SELECT count(*) FROM public.module_reference_items
WHERE applicable_module_ids && ARRAY[26,27,28,29,30,31,32];
