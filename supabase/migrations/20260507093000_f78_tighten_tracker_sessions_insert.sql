-- F78 hardening: the original INSERT policy on tracker_sessions had no
-- with_check qualifier, so any authed user could theoretically insert a
-- tracker_sessions row with another user's user_id. Service-role inserts
-- (the activate-plan edge function uses SUPABASE_SERVICE_ROLE_KEY) bypass
-- RLS entirely so they are unaffected. Tighten the row check to require
-- auth.uid() = user_id for all non-service-role inserts.
--
-- Anon users cannot insert at all under this policy because role is
-- restricted to authenticated and auth.uid() is null for anon (the
-- with_check fails).
--
-- Discovered during F78 audit. Not exploited.
DROP POLICY IF EXISTS "Users can insert their own tracker sessions" ON public.tracker_sessions;

CREATE POLICY "Users can insert their own tracker sessions"
ON public.tracker_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
