-- F53/F55 fix: extend the csid-based SELECT policy on reports to also cover
-- the authenticated role, so a user who authenticates mid-flow can still
-- read their own anon-created (user_id IS NULL) row by client_session_id.
--
-- Previous policy was restricted to {anon}, leaving authed users locked out
-- of their orphan rows. Both /processing polling and /teaser, /plan rendering
-- relied on this read; both timed out / went blank on orphan rows for any
-- authed user. (Bevan hit this on the 2026-05-06 CV-augmented test —
-- /processing timed out at 5min even though the row was teaser_ready in DB.)
--
-- Auth-by-user_id policy ("Users can view their own reports", role public)
-- continues to govern non-orphan rows. This new policy is purely additive.
DROP POLICY IF EXISTS "Anon can view reports by client_session_id" ON public.reports;

CREATE POLICY "Anon or authed can view reports by client_session_id"
ON public.reports
FOR SELECT
TO anon, authenticated
USING (
  user_id IS NULL
  AND client_session_id IS NOT NULL
  AND (client_session_id::text = (current_setting('request.headers', true)::jsonb ->> 'x-client-session-id'))
);
