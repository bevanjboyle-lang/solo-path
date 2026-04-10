
-- TABLE 1: tracker_sessions
CREATE TABLE public.tracker_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  original_plan JSONB NOT NULL,
  working_plan JSONB NOT NULL,
  running_narrative TEXT NOT NULL DEFAULT '',
  activated_at TIMESTAMP WITH TIME ZONE,
  current_day INTEGER NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  plan_state TEXT NOT NULL DEFAULT 'pending',
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracker_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracker sessions"
ON public.tracker_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracker sessions"
ON public.tracker_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracker sessions"
ON public.tracker_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_tracker_sessions_user ON public.tracker_sessions(user_id);
CREATE INDEX idx_tracker_sessions_report ON public.tracker_sessions(report_id);

CREATE TRIGGER update_tracker_sessions_updated_at
BEFORE UPDATE ON public.tracker_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABLE 2: checkin_history
CREATE TABLE public.checkin_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_session_id UUID NOT NULL REFERENCES public.tracker_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  state TEXT NOT NULL,
  exchanges JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_updates JSONB NOT NULL DEFAULT '[]'::jsonb,
  narrative_addition TEXT,
  replan_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.checkin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checkins"
ON public.checkin_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins"
ON public.checkin_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins"
ON public.checkin_history FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_checkin_history_session ON public.checkin_history(tracker_session_id);
CREATE INDEX idx_checkin_history_user ON public.checkin_history(user_id);

-- TABLE 3: replans
CREATE TABLE public.replans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracker_session_id UUID NOT NULL REFERENCES public.tracker_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  triggered_day INTEGER NOT NULL,
  replan_context JSONB NOT NULL,
  replan_output JSONB NOT NULL,
  replan_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.replans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own replans"
ON public.replans FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own replans"
ON public.replans FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replans"
ON public.replans FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_replans_session ON public.replans(tracker_session_id);
CREATE INDEX idx_replans_user ON public.replans(user_id);
