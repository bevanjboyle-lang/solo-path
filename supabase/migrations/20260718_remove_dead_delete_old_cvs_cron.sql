-- C0.3 completion (2026-07-18): the old nightly job 5 `delete-old-cvs` used
-- direct storage-table deletion, which Supabase hardened against; it has been
-- failing every night at 02:00 since. Its replacement `cleanup-old-cvs`
-- (Storage API, edge function, own cron) has been live and succeeding since
-- 15 July. This removes the dead job so the watchdog's failure check runs
-- clean. Found by weekly-cron-watchdog v2's first live run.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'delete-old-cvs') then
    perform cron.unschedule('delete-old-cvs');
  end if;
end $$;
