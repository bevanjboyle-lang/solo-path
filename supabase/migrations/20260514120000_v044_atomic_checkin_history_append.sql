-- V-044 — atomic checkin_history exchange append (vibe code review 2026-05-14)
--
-- Problem: process-checkin reads a checkin_history row, mutates the exchanges
-- array in JS, then writes it back. If two requests arrive for the same row
-- concurrently (most realistic case: user double-clicks submit while the first
-- response is still in flight), both reads return the same exchanges array,
-- both writes append against the stale copy, and the second write wins —
-- losing one exchange. The strand_signals dedup logic added in V-047 has the
-- same race shape: read existing, merge in JS, write back.
--
-- This migration introduces a Postgres function that does the append + merge
-- in a single statement, eliminating the read-modify-write window. Callers
-- (process-checkin) can either:
--   (a) switch entirely to this RPC, or
--   (b) keep the current pattern but wrap the exchange append + signal merge
--       in this RPC and update the rest of the fields via the normal UPDATE.
--
-- The RPC is SECURITY DEFINER + service_role-only, matching the V-072
-- service-role-write convention for tables without authenticated-INSERT/UPDATE
-- policies (checkin_history has authed SELECT but no authed UPDATE).
--
-- Apply: supabase db push (after CLI link)

CREATE OR REPLACE FUNCTION public.append_checkin_progress(
  p_checkin_id uuid,
  p_user_id uuid,
  p_new_exchange jsonb,
  p_state text DEFAULT NULL,
  p_narrative_addition text DEFAULT NULL,
  p_new_strand_signals jsonb DEFAULT '[]'::jsonb
) RETURNS public.checkin_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.checkin_history;
  v_existing_keys text[];
  v_signal jsonb;
  v_signal_key text;
  v_filtered_new_signals jsonb := '[]'::jsonb;
BEGIN
  -- Take a row lock so concurrent appends serialize. The SELECT FOR UPDATE +
  -- single UPDATE pattern is the canonical way to do read-modify-write atomically
  -- in PG without explicit transaction management from the caller.
  SELECT * INTO v_row
    FROM public.checkin_history
   WHERE id = p_checkin_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'checkin_history % not found for user %', p_checkin_id, p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Build the dedup set of existing (strand_id, signal) tuples so we only
  -- append signals not already present. Mirrors the V-047 JS dedup.
  v_existing_keys := ARRAY(
    SELECT (s->>'strand_id') || '::' || (s->>'signal')
      FROM jsonb_array_elements(COALESCE(v_row.strand_signals, '[]'::jsonb)) AS s
  );

  FOR v_signal IN SELECT jsonb_array_elements(COALESCE(p_new_strand_signals, '[]'::jsonb))
  LOOP
    v_signal_key := (v_signal->>'strand_id') || '::' || (v_signal->>'signal');
    IF NOT (v_signal_key = ANY(v_existing_keys)) THEN
      v_filtered_new_signals := v_filtered_new_signals || v_signal;
      v_existing_keys := array_append(v_existing_keys, v_signal_key);
    END IF;
  END LOOP;

  UPDATE public.checkin_history
     SET exchanges = COALESCE(exchanges, '[]'::jsonb) || jsonb_build_array(p_new_exchange),
         state = COALESCE(p_state, state),
         narrative_addition = COALESCE(p_narrative_addition, narrative_addition),
         strand_signals = COALESCE(strand_signals, '[]'::jsonb) || v_filtered_new_signals,
         updated_at = now()
   WHERE id = p_checkin_id
     AND user_id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Lock execution to service_role per V-072 convention. authenticated callers
-- go through the edge function, never call the RPC directly. Anon never reaches it.
REVOKE EXECUTE ON FUNCTION public.append_checkin_progress(uuid, uuid, jsonb, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.append_checkin_progress(uuid, uuid, jsonb, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.append_checkin_progress(uuid, uuid, jsonb, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.append_checkin_progress(uuid, uuid, jsonb, text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.append_checkin_progress IS
  'V-044 (vibe code review 2026-05-14): atomic append for checkin_history exchanges + state + strand_signals. SELECT FOR UPDATE + single UPDATE eliminates the read-modify-write race in process-checkin. Service-role only — invoked by the edge function.';
