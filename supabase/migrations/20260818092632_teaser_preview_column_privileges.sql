-- Move 5 (2026-08-18): make the paywall real at the database.
--
-- Until today the anonymous teaser page selected core_report (which contains
-- the full recommendation, income outlook, AI impact and hook paragraph),
-- plus ai_impact_section, hook_insight, activation_plan and market_snapshots,
-- into an unpaid browser. The teaser now consumes get-teaser-preview (service
-- role, server-side redaction), so the anon role no longer needs, and no
-- longer gets, SELECT on the sensitive columns.
--
-- Authenticated stays untouched: /report, /plan, AuthCallback, Questionnaire
-- and CVUpload all query with a user_id filter under the authenticated role,
-- and RLS row policies continue to scope rows. Anon keeps the harmless
-- columns the funnel still reads directly (id, status for /processing and
-- /payment-success polling; answers is the user's own input).

REVOKE SELECT (
  core_report,
  hook_insight,
  ai_impact_section,
  activation_plan,
  market_snapshots,
  recommended_selection,
  provisional_first_move,
  user_context_profile,
  candidate_hook_insights,
  candidate_first_moves,
  refinement_history,
  error
) ON public.reports FROM anon;
