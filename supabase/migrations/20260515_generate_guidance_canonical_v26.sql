-- Migration: generate-guidance v26 canonical reconciliation
-- Date: 2026-05-15
-- Spec: admin/generate-guidance-canonical-reconciliation-design.md
--
-- Adds:
--   1. guidance_generation_log table (observability per ADR-009 / ADR-019 pattern,
--      modelled on report_generation_log).
--   2. validation_passed column on guidance_module_completions (flags any output
--      that hit the validator's fallback path).
--   3. function_version column on guidance_module_completions (provenance for
--      forward debugging).
--
-- Pre-checks completed (2026-05-15):
--   - No duplicate (user_id, module_id) rows in guidance_module_completions.
--   - guidance_generation_log table does not yet exist.
--   - UNIQUE (user_id, module_id) constraint already in place — upsert is safe.

CREATE TABLE IF NOT EXISTS public.guidance_generation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  module_id       integer NOT NULL,
  function_version text NOT NULL,
  attempt         integer DEFAULT 1,
  passed          boolean NOT NULL,
  missing_fields  jsonb,
  too_short_fields jsonb,
  retry_triggered boolean DEFAULT false,
  openai_model    text,
  openai_usage    jsonb,
  latency_ms      integer,
  client_session_id uuid,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guidance_generation_log_user_module
  ON public.guidance_generation_log (user_id, module_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_generation_log_passed
  ON public.guidance_generation_log (passed, created_at DESC);

ALTER TABLE public.guidance_generation_log ENABLE ROW LEVEL SECURITY;

-- RLS: users can SELECT their own log rows; INSERT/UPDATE/DELETE are service-role only.
-- This matches the pattern documented in CLAUDE.md V-072 (implicit service-role-only writes).
CREATE POLICY "guidance_generation_log_select_own"
  ON public.guidance_generation_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- New columns on guidance_module_completions
ALTER TABLE public.guidance_module_completions
  ADD COLUMN IF NOT EXISTS validation_passed boolean DEFAULT true;

ALTER TABLE public.guidance_module_completions
  ADD COLUMN IF NOT EXISTS function_version text;

COMMENT ON COLUMN public.guidance_module_completions.validation_passed IS
  'Flags any output that hit the validator''s fallback path (failed all retries). v26+.';

COMMENT ON COLUMN public.guidance_module_completions.function_version IS
  'generate-guidance FUNCTION_VERSION that produced this output. v26+.';
