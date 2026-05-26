-- Module 20-25 reference items (Track E sector specialisms).
-- Applied via Supabase MCP apply_migration on 2026-05-25 during autonomous Track-A-to-F authoring sprint.
-- Bundle includes: FCA perimeter self-assessment, public sector procurement frameworks, tech consultant rates,
-- healthcare engagement routes, professional services positioning, creative IP and usage rights pricing.
-- 6 items inserted into public.module_reference_items.
--
-- These items carry conservative caveats per the Module 1 broker pattern (no impersonation; selection criteria
-- not named vendors where the work needs sector-specific vetting). Sector regulatory specifics flagged as
-- "verify with sector-experienced specialist before acting" where appropriate.
--
-- To re-export for a fresh DB rebuild, run:
--   SELECT * FROM public.module_reference_items WHERE applicable_module_ids && ARRAY[20,21,22,23,24,25];

SELECT count(*) FROM public.module_reference_items
WHERE applicable_module_ids && ARRAY[20,21,22,23,24,25];
