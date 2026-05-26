-- Module 10-19 reference items (Track C Financial Ops + Track D Commercial Practice).
-- Applied via Supabase MCP apply_migration on 2026-05-25 during autonomous Track-A-to-F authoring sprint.
-- Bundle includes: bookkeeping tools comparison, monthly close routine, invoice chasing sequence,
-- rate-setting baseline, allowable expenses checklist, pension vehicles comparison, weekly pipeline review,
-- proposal template structure, kickoff agenda checklist, client concentration risk.
-- 10 items inserted into public.module_reference_items.
--
-- To re-export for a fresh DB rebuild, run:
--   SELECT * FROM public.module_reference_items WHERE 10 = ANY(applicable_module_ids);
--
-- This migration is a marker; the substantive content was applied via MCP on
-- 2026-05-25 and is in the live module_reference_items table.

-- No-op SELECT to confirm the items are present
SELECT count(*) FROM public.module_reference_items
WHERE applicable_module_ids && ARRAY[10,11,12,13,14,15,16,17,18,19];
