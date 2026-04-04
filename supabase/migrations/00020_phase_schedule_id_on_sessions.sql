-- Add phase_schedule_id FK to workout_sessions so the calendar can match completions
-- by direct reference instead of the fragile program_workout_id + date composite key.

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS phase_schedule_id UUID
    REFERENCES public.phase_schedule(id) ON DELETE SET NULL;

-- Index for fast calendar completion lookups (phase_id + phase_schedule_id)
CREATE INDEX IF NOT EXISTS idx_workout_sessions_phase_schedule_id
  ON public.workout_sessions(phase_schedule_id)
  WHERE phase_schedule_id IS NOT NULL;

-- Backfill existing sessions where we can confidently match by
-- program_workout_id + date(started_at) = scheduled_date (best-effort)
UPDATE public.workout_sessions ws
SET phase_schedule_id = ps.id
FROM public.phase_schedule ps
WHERE ws.phase_id       = ps.phase_id
  AND ws.program_workout_id = ps.program_workout_id
  AND ws.phase_schedule_id IS NULL
  AND ws.ended_at IS NOT NULL
  AND DATE(ws.started_at AT TIME ZONE 'UTC') = ps.scheduled_date::date;
