-- Migration 00009: Exercise alternatives + Coach email lookup
-- 1. Adds alternatives uuid[] column to workout_exercises
-- 2. Creates SECURITY DEFINER function for coach email user lookup
-- 3. Populates alternatives for 3 Day Hypertrophy program exercises

-- ============================================
-- 1. ADD ALTERNATIVES COLUMN
-- ============================================
ALTER TABLE public.workout_exercises
ADD COLUMN alternatives uuid[] DEFAULT '{}';

-- ============================================
-- 2. COACH EMAIL LOOKUP FUNCTION
-- ============================================
-- Coaches need to look up users by email to add clients,
-- but RLS on users only allows reading own profile or active clients.
-- This SECURITY DEFINER function bypasses RLS safely, returning only the user ID.
CREATE OR REPLACE FUNCTION public.find_user_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.users WHERE email = lower(trim(lookup_email)) LIMIT 1;
$$;

-- Only authenticated users can call this
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

-- ============================================
-- 3. POPULATE ALTERNATIVES FOR 3 DAY HYPERTROPHY
-- ============================================
-- Maps each workout_exercise to its PDF-listed alternatives (existing exercises).

do $$
declare
  prog_id uuid;
  push_id uuid;
  pull_id uuid;
  leg_id uuid;

  -- Exercise IDs (looked up by name)
  -- Existing seed exercises
  ex_bb_bench uuid;
  ex_incline_db uuid;
  ex_db_flyes uuid;
  ex_cable_cross uuid;
  ex_machine_chest uuid;
  ex_push_ups uuid;
  ex_barbell_row uuid;
  ex_pull_ups uuid;
  ex_lat_pulldown uuid;
  ex_seated_cable_row uuid;
  ex_db_row uuid;
  ex_tbar_row uuid;
  ex_face_pulls uuid;
  ex_reverse_flyes uuid;
  ex_db_shoulder_press uuid;
  ex_lateral_raises uuid;
  ex_overhead_press uuid;
  ex_barbell_curl uuid;
  ex_db_curl uuid;
  ex_hammer_curl uuid;
  ex_cable_curl uuid;
  ex_preacher_curl uuid;
  ex_tricep_pushdown uuid;
  ex_skull_crushers uuid;
  ex_oh_tricep_ext uuid;
  ex_close_grip_bench uuid;
  ex_deadlift uuid;
  ex_rdl uuid;
  ex_sumo_dl uuid;
  ex_barbell_squat uuid;
  ex_front_squat uuid;
  ex_leg_press uuid;
  ex_leg_ext uuid;
  ex_leg_curl uuid;
  ex_hack_squat uuid;
  ex_walking_lunges uuid;
  ex_bulgarian_ss uuid;
  ex_calf_raises uuid;

  -- New exercises from migration 00008
  ex_incline_smith uuid;
  ex_low_incline_db uuid;
  ex_pec_dec uuid;
  ex_cable_crucifix_lat uuid;
  ex_bayesian_curl uuid;
  ex_tricep_rope_ext uuid;
  ex_barbell_seal_row uuid;
  ex_cs_prone_row uuid;
  ex_sa_reverse_pec uuid;
  ex_pin_preacher uuid;
  ex_katana_ext uuid;
  ex_stiff_leg_dl uuid;
  ex_bb_walking_lunge uuid;
  ex_sissy_squat uuid;
  ex_standing_calf uuid;
begin
  -- Get the 3 Day Hypertrophy program
  SELECT id INTO prog_id FROM public.programs WHERE name = '3 Day Hypertrophy' LIMIT 1;
  IF prog_id IS NULL THEN
    RAISE NOTICE '3 Day Hypertrophy program not found, skipping alternatives.';
    RETURN;
  END IF;

  -- Get workout IDs
  SELECT id INTO push_id FROM public.program_workouts WHERE program_id = prog_id AND name = 'Push' LIMIT 1;
  SELECT id INTO pull_id FROM public.program_workouts WHERE program_id = prog_id AND name = 'Pull' LIMIT 1;
  SELECT id INTO leg_id FROM public.program_workouts WHERE program_id = prog_id AND name = 'Legs' LIMIT 1;

  -- Look up existing seed exercises
  SELECT id INTO ex_bb_bench FROM public.exercises WHERE name = 'Barbell Bench Press' LIMIT 1;
  SELECT id INTO ex_incline_db FROM public.exercises WHERE name = 'Incline Dumbbell Press' LIMIT 1;
  SELECT id INTO ex_db_flyes FROM public.exercises WHERE name = 'Dumbbell Flyes' LIMIT 1;
  SELECT id INTO ex_cable_cross FROM public.exercises WHERE name = 'Cable Crossover' LIMIT 1;
  SELECT id INTO ex_machine_chest FROM public.exercises WHERE name = 'Machine Chest Press' LIMIT 1;
  SELECT id INTO ex_push_ups FROM public.exercises WHERE name = 'Push-Ups' LIMIT 1;
  SELECT id INTO ex_barbell_row FROM public.exercises WHERE name = 'Barbell Row' LIMIT 1;
  SELECT id INTO ex_pull_ups FROM public.exercises WHERE name = 'Pull-Ups' LIMIT 1;
  SELECT id INTO ex_lat_pulldown FROM public.exercises WHERE name = 'Lat Pulldown' LIMIT 1;
  SELECT id INTO ex_seated_cable_row FROM public.exercises WHERE name = 'Seated Cable Row' LIMIT 1;
  SELECT id INTO ex_db_row FROM public.exercises WHERE name = 'Dumbbell Row' LIMIT 1;
  SELECT id INTO ex_tbar_row FROM public.exercises WHERE name = 'T-Bar Row' LIMIT 1;
  SELECT id INTO ex_face_pulls FROM public.exercises WHERE name = 'Face Pulls' LIMIT 1;
  SELECT id INTO ex_reverse_flyes FROM public.exercises WHERE name = 'Reverse Flyes' LIMIT 1;
  SELECT id INTO ex_db_shoulder_press FROM public.exercises WHERE name = 'Dumbbell Shoulder Press' LIMIT 1;
  SELECT id INTO ex_lateral_raises FROM public.exercises WHERE name = 'Lateral Raises' LIMIT 1;
  SELECT id INTO ex_overhead_press FROM public.exercises WHERE name = 'Overhead Press' LIMIT 1;
  SELECT id INTO ex_barbell_curl FROM public.exercises WHERE name = 'Barbell Curl' LIMIT 1;
  SELECT id INTO ex_db_curl FROM public.exercises WHERE name = 'Dumbbell Curl' LIMIT 1;
  SELECT id INTO ex_hammer_curl FROM public.exercises WHERE name = 'Hammer Curl' LIMIT 1;
  SELECT id INTO ex_cable_curl FROM public.exercises WHERE name = 'Cable Curl' LIMIT 1;
  SELECT id INTO ex_preacher_curl FROM public.exercises WHERE name = 'Preacher Curl' LIMIT 1;
  SELECT id INTO ex_tricep_pushdown FROM public.exercises WHERE name = 'Tricep Pushdown' LIMIT 1;
  SELECT id INTO ex_skull_crushers FROM public.exercises WHERE name = 'Skull Crushers' LIMIT 1;
  SELECT id INTO ex_oh_tricep_ext FROM public.exercises WHERE name = 'Overhead Tricep Extension' LIMIT 1;
  SELECT id INTO ex_close_grip_bench FROM public.exercises WHERE name = 'Close-Grip Bench Press' LIMIT 1;
  SELECT id INTO ex_deadlift FROM public.exercises WHERE name = 'Deadlift' LIMIT 1;
  SELECT id INTO ex_rdl FROM public.exercises WHERE name = 'Romanian Deadlift' LIMIT 1;
  SELECT id INTO ex_sumo_dl FROM public.exercises WHERE name = 'Sumo Deadlift' LIMIT 1;
  SELECT id INTO ex_barbell_squat FROM public.exercises WHERE name = 'Barbell Squat' LIMIT 1;
  SELECT id INTO ex_front_squat FROM public.exercises WHERE name = 'Front Squat' LIMIT 1;
  SELECT id INTO ex_leg_press FROM public.exercises WHERE name = 'Leg Press' LIMIT 1;
  SELECT id INTO ex_leg_ext FROM public.exercises WHERE name = 'Leg Extension' LIMIT 1;
  SELECT id INTO ex_leg_curl FROM public.exercises WHERE name = 'Leg Curl' LIMIT 1;
  SELECT id INTO ex_hack_squat FROM public.exercises WHERE name = 'Hack Squat' LIMIT 1;
  SELECT id INTO ex_walking_lunges FROM public.exercises WHERE name = 'Walking Lunges' LIMIT 1;
  SELECT id INTO ex_bulgarian_ss FROM public.exercises WHERE name = 'Bulgarian Split Squat' LIMIT 1;
  SELECT id INTO ex_calf_raises FROM public.exercises WHERE name = 'Calf Raises' LIMIT 1;

  -- Look up migration 00008 exercises
  SELECT id INTO ex_incline_smith FROM public.exercises WHERE name = 'Incline Smith Press' LIMIT 1;
  SELECT id INTO ex_low_incline_db FROM public.exercises WHERE name = 'Low Incline DB Chest Press' LIMIT 1;
  SELECT id INTO ex_pec_dec FROM public.exercises WHERE name = 'Pec Dec Fly' LIMIT 1;
  SELECT id INTO ex_cable_crucifix_lat FROM public.exercises WHERE name = 'Cable Crucifix Lateral Raise' LIMIT 1;
  SELECT id INTO ex_bayesian_curl FROM public.exercises WHERE name = 'Bayesian Curl' LIMIT 1;
  SELECT id INTO ex_tricep_rope_ext FROM public.exercises WHERE name = 'Tricep Rope Extension' LIMIT 1;
  SELECT id INTO ex_barbell_seal_row FROM public.exercises WHERE name = 'Barbell Seal Row' LIMIT 1;
  SELECT id INTO ex_cs_prone_row FROM public.exercises WHERE name = 'Chest Supported Bi-Lateral Prone Row' LIMIT 1;
  SELECT id INTO ex_sa_reverse_pec FROM public.exercises WHERE name = 'Single Arm Reverse Pec Dec' LIMIT 1;
  SELECT id INTO ex_pin_preacher FROM public.exercises WHERE name = 'Pin Loaded Preacher Curl' LIMIT 1;
  SELECT id INTO ex_katana_ext FROM public.exercises WHERE name = 'Triceps Katana Extension' LIMIT 1;
  SELECT id INTO ex_stiff_leg_dl FROM public.exercises WHERE name = 'Barbell Stiff Leg Deadlift' LIMIT 1;
  SELECT id INTO ex_bb_walking_lunge FROM public.exercises WHERE name = 'Barbell Walking Lunge' LIMIT 1;
  SELECT id INTO ex_sissy_squat FROM public.exercises WHERE name = 'Sissy Squat' LIMIT 1;
  SELECT id INTO ex_standing_calf FROM public.exercises WHERE name = 'Standing Calf Raise' LIMIT 1;

  -- ============================================
  -- PUSH DAY ALTERNATIVES
  -- ============================================

  -- 1. Incline Smith Press → DB Shoulder Press, BB Bench, Incline DB Press
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_db_shoulder_press, ex_bb_bench, ex_incline_db]
  WHERE program_workout_id = push_id AND exercise_id = ex_incline_smith;

  -- 2. Low Incline DB Chest Press → BB Bench, Machine Chest Press, DB Flyes
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_bb_bench, ex_machine_chest, ex_db_flyes]
  WHERE program_workout_id = push_id AND exercise_id = ex_low_incline_db;

  -- 3. Pec Dec Fly → Cable Crossover, DB Flyes
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_cable_cross, ex_db_flyes]
  WHERE program_workout_id = push_id AND exercise_id = ex_pec_dec;

  -- 4. Cable Crucifix Lateral Raise → Lateral Raises, DB Shoulder Press
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_lateral_raises, ex_db_shoulder_press]
  WHERE program_workout_id = push_id AND exercise_id = ex_cable_crucifix_lat;

  -- 5. Bayesian Curl → Cable Curl, DB Curl, Hammer Curl
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_cable_curl, ex_db_curl, ex_hammer_curl]
  WHERE program_workout_id = push_id AND exercise_id = ex_bayesian_curl;

  -- 6. Tricep Rope Extension → Tricep Pushdown, OH Tricep Ext
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_tricep_pushdown, ex_oh_tricep_ext]
  WHERE program_workout_id = push_id AND exercise_id = ex_tricep_rope_ext;

  -- ============================================
  -- PULL DAY ALTERNATIVES
  -- ============================================

  -- 1. Barbell Seal Row → Barbell Row, T-Bar Row, DB Row
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_barbell_row, ex_tbar_row, ex_db_row]
  WHERE program_workout_id = pull_id AND exercise_id = ex_barbell_seal_row;

  -- 2. Pull-Ups → Lat Pulldown
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_lat_pulldown]
  WHERE program_workout_id = pull_id AND exercise_id = ex_pull_ups;

  -- 3. Chest Supported Prone Row → Seated Cable Row, DB Row, Barbell Row
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_seated_cable_row, ex_db_row, ex_barbell_row]
  WHERE program_workout_id = pull_id AND exercise_id = ex_cs_prone_row;

  -- 4. Single Arm Reverse Pec Dec → Reverse Flyes, Face Pulls
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_reverse_flyes, ex_face_pulls]
  WHERE program_workout_id = pull_id AND exercise_id = ex_sa_reverse_pec;

  -- 5. Pin Loaded Preacher Curl → Preacher Curl, Barbell Curl
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_preacher_curl, ex_barbell_curl]
  WHERE program_workout_id = pull_id AND exercise_id = ex_pin_preacher;

  -- 6. Triceps Katana Extension → OH Tricep Ext, Skull Crushers
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_oh_tricep_ext, ex_skull_crushers]
  WHERE program_workout_id = pull_id AND exercise_id = ex_katana_ext;

  -- ============================================
  -- LEGS DAY ALTERNATIVES
  -- ============================================

  -- 1. Barbell Stiff Leg Deadlift → Romanian Deadlift, Deadlift, Sumo Deadlift
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_rdl, ex_deadlift, ex_sumo_dl]
  WHERE program_workout_id = leg_id AND exercise_id = ex_stiff_leg_dl;

  -- 2. Hack Squat → Leg Press, Barbell Squat, Front Squat
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_leg_press, ex_barbell_squat, ex_front_squat]
  WHERE program_workout_id = leg_id AND exercise_id = ex_hack_squat;

  -- 3. Leg Curl → Romanian Deadlift (hamstring alternatives)
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_rdl]
  WHERE program_workout_id = leg_id AND exercise_id = ex_leg_curl;

  -- 4. Barbell Walking Lunge → Walking Lunges, Bulgarian Split Squat
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_walking_lunges, ex_bulgarian_ss]
  WHERE program_workout_id = leg_id AND exercise_id = ex_bb_walking_lunge;

  -- 5. Sissy Squat → Leg Extension
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_leg_ext]
  WHERE program_workout_id = leg_id AND exercise_id = ex_sissy_squat;

  -- 6. Standing Calf Raise → Calf Raises
  UPDATE public.workout_exercises
  SET alternatives = ARRAY[ex_calf_raises]
  WHERE program_workout_id = leg_id AND exercise_id = ex_standing_calf;

end $$;
