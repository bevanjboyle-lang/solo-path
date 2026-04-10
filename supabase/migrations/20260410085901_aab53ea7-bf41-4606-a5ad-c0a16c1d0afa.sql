
CREATE TABLE public.tracker_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  phase_index INTEGER NOT NULL,
  day_index INTEGER NOT NULL,
  task_index INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_id, phase_index, day_index, task_index)
);

ALTER TABLE public.tracker_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.tracker_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.tracker_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.tracker_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
ON public.tracker_progress FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_tracker_progress_user_report ON public.tracker_progress(user_id, report_id);
