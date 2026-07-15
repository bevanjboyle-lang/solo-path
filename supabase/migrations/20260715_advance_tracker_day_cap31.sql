-- 2026-07-15 Day Zero C0.4 — fix the day-31 wall never firing (P0).
--
-- FINDING: pg_cron job 2 (advance-tracker-day) capped current_day at 30 with
-- LEAST(..., 30) AND current_day < 30, while the frontend's subscription wall
-- state (Plan.tsx: day31_nosub) fires on `currentDay > 30`. Day 31 could never
-- arrive, so the day-30/31 subscribe wall never rendered for any user.
-- Verified live on 2026-07-15: after this fix Bevan's tracker (the only real
-- one) advanced to 31 and the wall rendered correctly (subscribe CTA works,
-- check-ins locked, report accessible).
--
-- FIX (applied 2026-07-15 via cron.alter_job on the live project): the nightly
-- advancer now carries non-subscribers to day 31 (the wall state) and lets
-- active subscribers keep counting per bible §25/§29 (continued tracker).
--
-- NOTE: this file documents a pg_cron COMMAND change, not a schema change.
-- It is recorded here per W6 migration discipline so the cron definition is
-- reproducible. Re-running it is safe (idempotent alter).

SELECT cron.alter_job(2, command := $$
  -- Advance current_day for all active tracker sessions based on activated_at.
  -- 2026-07-15 fix (Day Zero): the old cap of 30 meant the frontend's day-31
  -- wall condition (currentDay > 30 -> day31_nosub) could never fire for
  -- anyone. Non-subscribers now stop at day 31 (the wall state); active
  -- subscribers keep counting (continued tracker per bible section 25/29).
  UPDATE tracker_sessions
  SET current_day = CASE
        WHEN subscription_status = 'active'
          THEN (CURRENT_DATE - activated_at::date) + 1
        ELSE LEAST((CURRENT_DATE - activated_at::date) + 1, 31)
      END,
      updated_at = now()
  WHERE status = 'active'
    AND activated_at IS NOT NULL
    AND (subscription_status = 'active' OR current_day < 31);

  -- Mark day-30 reached for sessions that just hit 30
  UPDATE tracker_sessions
  SET day_30_reached_at = now(),
      updated_at = now()
  WHERE status = 'active'
    AND current_day >= 30
    AND day_30_reached_at IS NULL;
  $$);
