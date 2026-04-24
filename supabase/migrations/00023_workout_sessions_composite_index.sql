-- Composite index tuned for the home screen and progress queries.
--
-- The hot read path is:
--   SELECT ... FROM workout_sessions
--    WHERE user_id = $1
--      AND ended_at IS NOT NULL
--    ORDER BY started_at DESC
--    LIMIT 60;
--
-- The existing `idx_workout_sessions_user` on (user_id) narrows the candidate
-- rows but leaves Postgres to do a separate sort. A composite on
-- (user_id, started_at DESC) gives the planner both the filter and the sort
-- from a single index scan.
--
-- Notes:
--   - We keep the single-column index for now. It's ~cheap and other queries
--     (e.g. joined lookups by user_id without a sort) may still use it.
--     A future audit via pg_stat_user_indexes can drop it if truly unused.
--   - Not creating CONCURRENTLY because Supabase migrations run inside a
--     transaction and workout_sessions is small. If this table ever grows
--     large enough to matter, promote this to a CONCURRENTLY migration.
--   - Left as non-partial (no `WHERE ended_at IS NOT NULL` predicate) so
--     it also serves calendar / progress queries that scan in-progress rows.

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_started
  ON public.workout_sessions (user_id, started_at DESC);

COMMENT ON INDEX public.idx_workout_sessions_user_started IS
  'Composite for per-user recent-first session scans (home, progress, coach views).';
