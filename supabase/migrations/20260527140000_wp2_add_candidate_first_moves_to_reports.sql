-- WP2 sub-PR B — Best-of-N for first_move.
-- Mirrors the sub-PR A migration shape at supabase/migrations/20260527110000_wp2_add_candidate_hook_insights_to_reports.sql.
--
-- Adds two nullable columns to public.reports for storing best-of-N first move
-- regeneration outputs. Existing rows remain unaffected (NULL on both columns).
-- The regenerate-first-move edge function (deployed alongside this migration)
-- populates both columns AFTER persisting the monolith's activation_plan.

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS candidate_first_moves JSONB,
ADD COLUMN IF NOT EXISTS first_move_winner_index INTEGER;

COMMENT ON COLUMN public.reports.candidate_first_moves IS
'Array of {first_move, judge_5_score, judge_5_sub_scores, judge_5_must_not_be_matched, judge_5_justification, prompt_hash, generated_at} objects, in order generated. Set by regenerate-first-move edge function. Null on rows generated pre-WP2 sub-PR B.';

COMMENT ON COLUMN public.reports.first_move_winner_index IS
'Zero-based index into candidate_first_moves of the row that got promoted into activation_plan.first_move and provisional_first_move. Null on rows generated pre-WP2 sub-PR B.';
