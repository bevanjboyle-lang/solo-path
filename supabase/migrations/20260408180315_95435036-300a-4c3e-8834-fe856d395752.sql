
-- Reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  core_report jsonb,
  activation_plan jsonb,
  market_snapshot text,
  status text NOT NULL DEFAULT 'processing',
  error text
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

-- Knowledge bank storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-bank', 'knowledge-bank', true);

CREATE POLICY "Public read access for knowledge-bank"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knowledge-bank');
