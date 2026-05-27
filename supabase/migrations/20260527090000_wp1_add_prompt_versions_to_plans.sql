-- WP1 sub-PR D: Prompt versioning column on plans.
--
-- Adds a JSONB column to capture which prompt versions produced each plan
-- row. Read by the eval harness (evals/run_eval.ts) for traceability when a
-- production behaviour needs to be tied back to a specific prompt-set state.
--
-- Schema of the JSONB value (no enforced shape, but the convention is):
--   {
--     "P0":       { "version": "1.0.0", "hash": "abc..." },
--     "P0b":      { "version": "1.0.0", "hash": "abc..." },
--     "P1":       { "version": "1.0.0", "hash": "abc..." },
--     "P3":       { "version": "1.0.0", "hash": "abc..." },
--     "P4":       { "version": "1.0.0", "hash": "abc..." },
--     "P7":       { "version": "1.0.0", "hash": "abc..." },
--     "aggregate":"<hash from evals/recompute_prompt_hash.sh>"
--   }
--
-- Backfill behaviour: existing rows are left NULL. New rows from this point
-- forward must populate `prompt_versions`. Edge function wiring lands as part
-- of WP10 (codebase hygiene) when prompts move to file-loaded modules; until
-- then, individual generation functions can populate this manually.

ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS prompt_versions JSONB;

COMMENT ON COLUMN public.plans.prompt_versions IS
'Map of prompt_id -> {version, hash} for every prompt that contributed to this plan row. Populated by edge functions from this point forward; existing rows are NULL and reflect pre-WP1 generation. See `admin/wp1-eval-harness-design.md` v1.1 Sub-PR D.';
