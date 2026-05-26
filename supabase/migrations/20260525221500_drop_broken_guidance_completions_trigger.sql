-- Drop the broken guidance_module_completions BEFORE UPDATE trigger.
--
-- Bug: a BEFORE UPDATE trigger `guidance_completions_updated_at` calls
-- function `update_guidance_completions_updated_at()` which sets
-- NEW.updated_at = now(). The table has no `updated_at` column, so the
-- trigger function errors on every UPDATE. The error propagates to the
-- UPDATE statement, which fails.
--
-- Impact: every upsert with onConflict (user_id, module_id) on this table
-- hit the broken trigger and silently failed (the application try/catch
-- around the upsert logged with console.error only, never threw). Result:
-- no completion row in this table has been updated by the application
-- since the trigger was added. The orphan row at
-- id=8f8ee23a-fc88-4802-b501-dea26f7b95a7 (user 64c2d309, module 1) from
-- 2026-05-07 has been blocking all subsequent persistence for that user
-- and module combination, and the same applies to any other (user, module)
-- pair that already had a row.
--
-- Surfaced 2026-05-25 during Module 1 reference-layer smoke when DB
-- inspection found only one stale row for module 1 despite three v28
-- generations today (all visible in guidance_generation_log).
--
-- Fix: drop the trigger and the function. The table already has a
-- `completed_at` column that the application sets explicitly on every
-- upsert (line 555 of generate-guidance/index.ts), so a separate
-- updated_at maintained by trigger is redundant. The trigger was likely
-- added speculatively without the companion ALTER TABLE.
--
-- After this migration, the next upsert with ON CONFLICT will UPDATE
-- cleanly and the persistence path works as the function expects.

DROP TRIGGER IF EXISTS guidance_completions_updated_at
  ON public.guidance_module_completions;

DROP FUNCTION IF EXISTS public.update_guidance_completions_updated_at();
