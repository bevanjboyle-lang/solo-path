-- Move 5 fix (2026-08-18): the previous migration's column-level REVOKE was a
-- no-op because anon holds a TABLE-level SELECT grant, and Postgres privileges
-- are additive (a column revoke cannot subtract from a table grant). Correct
-- pattern: drop the table-level SELECT for anon, grant back only the columns
-- the anonymous funnel legitimately reads (/processing and /payment-success
-- poll id+status; answers is the user's own input; the selected_* pair is
-- harmless carry-through).
--
-- VERIFIED LIVE 2026-08-18: anon + owning x-client-session-id selecting
-- core_report now returns 401 permission denied; id,status returns 200.
-- The authenticated role's table-level grant is untouched, so /report, /plan,
-- AuthCallback, Questionnaire and CVUpload behave exactly as before.

REVOKE SELECT ON public.reports FROM anon;

GRANT SELECT (
  id,
  status,
  created_at,
  client_session_id,
  answers,
  selected_strands,
  selected_option_rank
) ON public.reports TO anon;
