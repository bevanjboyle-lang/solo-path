-- Add CV upload columns to user_profiles
-- Supports the CV upload feature (Prompt 0 / parse-cv Edge Function)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS cv_uploaded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cv_extract jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cv_confidence_score integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cv_raw_text text DEFAULT NULL;

-- Index for querying users who uploaded a CV
CREATE INDEX IF NOT EXISTS idx_user_profiles_cv_uploaded
  ON user_profiles (cv_uploaded)
  WHERE cv_uploaded = true;
