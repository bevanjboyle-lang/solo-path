alter table public.tracker_sessions
  add column if not exists narrative_summarised_through_day integer not null default 0;

comment on column public.tracker_sessions.narrative_summarised_through_day is
  'WP4 §4.3 watermark. Check-ins with day_number <= this value have been folded into running_narrative by the nightly summarise-old-checkins job and are excluded from the assembler''s recent_checkins block. Raw checkin_history rows remain immutable.';
