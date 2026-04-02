-- 3 Day Hypertrophy Program: Push / Pull / Legs
-- Source: Ketan Maurya's coaching PDFs (Mar 2026)
-- Exercises that don't exist yet are created as approved.
-- Program is public so all users can browse and clone it.

do $$
declare
  chest_id uuid;
  back_id uuid;
  shoulders_id uuid;
  biceps_id uuid;
  triceps_id uuid;
  legs_id uuid;

  -- Program & workout IDs
  prog_id uuid;
  push_id uuid;
  pull_id uuid;
  leg_id uuid;

  -- Exercise IDs (new exercises)
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

  -- Existing exercise IDs
  ex_pull_ups uuid;
  ex_hack_squat uuid;
  ex_leg_curl uuid;
begin
  -- Get muscle group IDs
  SELECT id INTO chest_id FROM public.muscle_groups WHERE name = 'Chest';
  SELECT id INTO back_id FROM public.muscle_groups WHERE name = 'Back';
  SELECT id INTO shoulders_id FROM public.muscle_groups WHERE name = 'Shoulders';
  SELECT id INTO biceps_id FROM public.muscle_groups WHERE name = 'Biceps';
  SELECT id INTO triceps_id FROM public.muscle_groups WHERE name = 'Triceps';
  SELECT id INTO legs_id FROM public.muscle_groups WHERE name = 'Legs';

  -- ============================================
  -- NEW EXERCISES
  -- ============================================

  -- PUSH exercises
  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Incline Smith Press', chest_id, 'Incline bench press on Smith machine for upper chest.', true)
  RETURNING id INTO ex_incline_smith;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Low Incline DB Chest Press', chest_id, 'Low incline dumbbell press targeting mid-upper chest.', true)
  RETURNING id INTO ex_low_incline_db;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Pec Dec Fly', chest_id, 'Pec deck machine fly for chest isolation and stretch.', true)
  RETURNING id INTO ex_pec_dec;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Cable Crucifix Lateral Raise', shoulders_id, 'Lateral raise using two cable stations in crucifix position for constant tension on side delts.', true)
  RETURNING id INTO ex_cable_crucifix_lat;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Bayesian Curl', biceps_id, 'Cable curl with arm behind the body for a deep bicep stretch under load.', true)
  RETURNING id INTO ex_bayesian_curl;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Tricep Rope Extension', triceps_id, 'Rope pushdown on cable machine for tricep isolation.', true)
  RETURNING id INTO ex_tricep_rope_ext;

  -- PULL exercises
  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Barbell Seal Row', back_id, 'Barbell row lying face-down on an elevated bench, eliminating momentum.', true)
  RETURNING id INTO ex_barbell_seal_row;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Chest Supported Bi-Lateral Prone Row', back_id, 'Chest-supported row hitting both sides simultaneously for mid-back thickness.', true)
  RETURNING id INTO ex_cs_prone_row;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Single Arm Reverse Pec Dec', shoulders_id, 'One-arm reverse fly on pec dec machine for rear delt isolation.', true)
  RETURNING id INTO ex_sa_reverse_pec;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Pin Loaded Preacher Curl', biceps_id, 'Preacher curl on a pin-loaded machine for consistent resistance.', true)
  RETURNING id INTO ex_pin_preacher;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Triceps Katana Extension', triceps_id, 'Cable tricep extension with a slashing motion for long head emphasis.', true)
  RETURNING id INTO ex_katana_ext;

  -- LEGS exercises
  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Barbell Stiff Leg Deadlift', legs_id, 'Stiff-legged barbell deadlift for hamstring and glute development.', true)
  RETURNING id INTO ex_stiff_leg_dl;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Barbell Walking Lunge', legs_id, 'Walking lunges with a barbell on back for quads and glutes.', true)
  RETURNING id INTO ex_bb_walking_lunge;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Sissy Squat', legs_id, 'Bodyweight or machine sissy squat for quad isolation and deep stretch.', true)
  RETURNING id INTO ex_sissy_squat;

  INSERT INTO public.exercises (name, muscle_group_id, description, is_approved)
  VALUES ('Standing Calf Raise', legs_id, 'Standing calf raise machine for gastrocnemius development.', true)
  RETURNING id INTO ex_standing_calf;

  -- Get existing exercise IDs
  SELECT id INTO ex_pull_ups FROM public.exercises WHERE name = 'Pull-Ups' LIMIT 1;
  SELECT id INTO ex_hack_squat FROM public.exercises WHERE name = 'Hack Squat' LIMIT 1;
  SELECT id INTO ex_leg_curl FROM public.exercises WHERE name = 'Leg Curl' LIMIT 1;

  -- ============================================
  -- CREATE PROGRAM
  -- ============================================
  INSERT INTO public.programs (name, description, user_id, is_public)
  VALUES (
    '3 Day Hypertrophy',
    'Push/Pull/Legs hypertrophy program. Uses top-set-with-back-off and progressive overload protocols. Aim for the highest rep range each set — once achieved, increase load by 2.5-5kg.',
    null,
    true
  )
  RETURNING id INTO prog_id;

  -- ============================================
  -- WORKOUTS
  -- ============================================
  INSERT INTO public.program_workouts (program_id, name, day_order)
  VALUES (prog_id, 'Push', 1) RETURNING id INTO push_id;

  INSERT INTO public.program_workouts (program_id, name, day_order)
  VALUES (prog_id, 'Pull', 2) RETURNING id INTO pull_id;

  INSERT INTO public.program_workouts (program_id, name, day_order)
  VALUES (prog_id, 'Legs', 3) RETURNING id INTO leg_id;

  -- ============================================
  -- PUSH DAY EXERCISES
  -- ============================================
  -- 1. Incline Smith Press: 3 sets × 12 reps (top set 6-8, back-off 10-12)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (push_id, ex_incline_smith, 3, 12, 1);

  -- 2. Low Incline DB Chest Press: 3 sets × 12 reps (top set 6-8, back-off 10-12)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (push_id, ex_low_incline_db, 3, 12, 2);

  -- 3. Pec Dec Fly: 3 sets × 10 reps (6-10 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (push_id, ex_pec_dec, 3, 10, 3);

  -- 4. Cable Crucifix Lateral Raise: 3 sets × 15 reps (10-15 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (push_id, ex_cable_crucifix_lat, 3, 15, 4);

  -- 5. Bayesian Curl: 3 sets × 15 reps (10-15 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (push_id, ex_bayesian_curl, 3, 15, 5);

  -- 6. Tricep Rope Extension: 3 sets × 12 reps (8-12 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (push_id, ex_tricep_rope_ext, 3, 12, 6);

  -- ============================================
  -- PULL DAY EXERCISES
  -- ============================================
  -- 1. Barbell Seal Row: 3 sets × 10 reps (5-10 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (pull_id, ex_barbell_seal_row, 3, 10, 1);

  -- 2. Pull Ups: 3 sets × 12 reps (6-12 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (pull_id, ex_pull_ups, 3, 12, 2);

  -- 3. Chest Supported Bi-Lateral Prone Row: 3 sets × 12 reps (6-12 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (pull_id, ex_cs_prone_row, 3, 12, 3);

  -- 4. Single Arm Reverse Pec Dec: 3 sets × 15 reps (10-15 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (pull_id, ex_sa_reverse_pec, 3, 15, 4);

  -- 5. Pin Loaded Preacher Curl: 3 sets × 10 reps (5-10 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (pull_id, ex_pin_preacher, 3, 10, 5);

  -- 6. Triceps Katana Extension: 3 sets × 15 reps (10-15 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (pull_id, ex_katana_ext, 3, 15, 6);

  -- ============================================
  -- LEGS DAY EXERCISES
  -- ============================================
  -- 1. Barbell Stiff Leg Deadlift: 2 sets × 10 reps (top set 4-6, back-off 8-10)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (leg_id, ex_stiff_leg_dl, 2, 10, 1);

  -- 2. Hack Squat: 2 sets × 12 reps (6-12 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (leg_id, ex_hack_squat, 2, 12, 2);

  -- 3. Leg Curl (Laying): 3 sets × 12 reps (8-12 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (leg_id, ex_leg_curl, 3, 12, 3);

  -- 4. Barbell Walking Lunge: 3 sets × 15 reps (10-15 range) *superset with sissy squats on last set
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (leg_id, ex_bb_walking_lunge, 3, 15, 4);

  -- 5. Sissy Squat: 1 set to failure
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (leg_id, ex_sissy_squat, 1, 20, 5);

  -- 6. Standing Calf Raise: 3 sets × 15 reps (12-15 range)
  INSERT INTO public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
  VALUES (leg_id, ex_standing_calf, 3, 15, 6);

end $$;
