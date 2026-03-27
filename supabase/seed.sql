-- RepFlow Seed Data
-- Pre-loaded muscle groups and exercise library

-- ============================================
-- MUSCLE GROUPS
-- ============================================
insert into public.muscle_groups (name, icon, sort_order) values
  ('Chest', '🫁', 1),
  ('Back', '🔙', 2),
  ('Shoulders', '🏋️', 3),
  ('Biceps', '💪', 4),
  ('Triceps', '💪', 5),
  ('Legs', '🦵', 6),
  ('Glutes', '🍑', 7),
  ('Core', '🎯', 8),
  ('Cardio', '❤️', 9),
  ('Full Body', '🏃', 10);

-- ============================================
-- EXERCISES (pre-approved)
-- ============================================

-- Get muscle group IDs
do $$
declare
  chest_id uuid;
  back_id uuid;
  shoulders_id uuid;
  biceps_id uuid;
  triceps_id uuid;
  legs_id uuid;
  glutes_id uuid;
  core_id uuid;
  cardio_id uuid;
  full_body_id uuid;
begin
  select id into chest_id from public.muscle_groups where name = 'Chest';
  select id into back_id from public.muscle_groups where name = 'Back';
  select id into shoulders_id from public.muscle_groups where name = 'Shoulders';
  select id into biceps_id from public.muscle_groups where name = 'Biceps';
  select id into triceps_id from public.muscle_groups where name = 'Triceps';
  select id into legs_id from public.muscle_groups where name = 'Legs';
  select id into glutes_id from public.muscle_groups where name = 'Glutes';
  select id into core_id from public.muscle_groups where name = 'Core';
  select id into cardio_id from public.muscle_groups where name = 'Cardio';
  select id into full_body_id from public.muscle_groups where name = 'Full Body';

  -- CHEST (8 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Barbell Bench Press', chest_id, 'Flat bench press with barbell. Primary chest builder.', true, 'https://www.youtube.com/shorts/hWbUlkb5Ms4'),
    ('Incline Dumbbell Press', chest_id, 'Incline bench press with dumbbells targeting upper chest.', true, 'https://www.youtube.com/shorts/8fXfwG4ftaQ'),
    ('Decline Bench Press', chest_id, 'Decline angle bench press targeting lower chest.', true, 'https://www.youtube.com/shorts/a-UFQE4oxWY'),
    ('Dumbbell Flyes', chest_id, 'Flat bench flyes for chest stretch and contraction.', true, 'https://www.youtube.com/shorts/rk8YayRoTRQ'),
    ('Cable Crossover', chest_id, 'Standing cable flyes for constant tension on chest.', true, 'https://www.youtube.com/shorts/M97ra0UR-40'),
    ('Push-Ups', chest_id, 'Bodyweight push-ups. Versatile chest and tricep exercise.', true, 'https://www.youtube.com/shorts/qU_QESJ7zPs'),
    ('Chest Dips', chest_id, 'Leaning forward dips emphasizing chest.', true, 'https://www.youtube.com/shorts/NuhXmq6x9Sk'),
    ('Machine Chest Press', chest_id, 'Guided chest press machine for isolation.', true, 'https://www.youtube.com/shorts/Qu7-ceCvq7w');

  -- BACK (9 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Deadlift', back_id, 'Conventional deadlift. Compound movement for entire posterior chain.', true, 'https://www.youtube.com/shorts/ZaTM37cfiDs'),
    ('Barbell Row', back_id, 'Bent-over barbell row targeting mid-back.', true, 'https://www.youtube.com/shorts/phVtqawIgbk'),
    ('Pull-Ups', back_id, 'Bodyweight pull-ups for lats and upper back.', true, 'https://www.youtube.com/shorts/ym1V5H35IpA'),
    ('Lat Pulldown', back_id, 'Cable lat pulldown for lat width.', true, 'https://www.youtube.com/shorts/bNmvKpJSWKM'),
    ('Seated Cable Row', back_id, 'Seated row with cable for mid-back thickness.', true, 'https://www.youtube.com/shorts/qD1WZ5pSuvk'),
    ('Dumbbell Row', back_id, 'Single-arm dumbbell row for unilateral back work.', true, 'https://www.youtube.com/shorts/vu_YDt9nGv4'),
    ('T-Bar Row', back_id, 'T-bar row for mid-back thickness.', true, 'https://www.youtube.com/shorts/8pR3JoZ0iBU'),
    ('Face Pulls', back_id, 'Cable face pulls for rear delts and upper back health.', true, 'https://www.youtube.com/shorts/IeOqdw9WI90'),
    ('Hyperextensions', back_id, 'Back extension for lower back strength.', true, 'https://www.youtube.com/shorts/S1_eZIIZlIc');

  -- SHOULDERS (7 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Overhead Press', shoulders_id, 'Standing barbell overhead press. Primary shoulder builder.', true, 'https://www.youtube.com/shorts/s-T3E6654A8'),
    ('Dumbbell Shoulder Press', shoulders_id, 'Seated or standing dumbbell shoulder press.', true, 'https://www.youtube.com/shorts/OLePvpxQEGk'),
    ('Lateral Raises', shoulders_id, 'Dumbbell lateral raises for side delts.', true, 'https://www.youtube.com/shorts/Kl3LEzQ5Zqs'),
    ('Front Raises', shoulders_id, 'Dumbbell front raises for anterior delts.', true, 'https://www.youtube.com/shorts/yHx8wPv4RPo'),
    ('Reverse Flyes', shoulders_id, 'Bent-over reverse flyes for rear delts.', true, 'https://www.youtube.com/shorts/LsT-bR_zxLo'),
    ('Arnold Press', shoulders_id, 'Rotational dumbbell press hitting all delt heads.', true, 'https://www.youtube.com/shorts/6K_N9AGhItQ'),
    ('Upright Row', shoulders_id, 'Barbell or dumbbell upright row for traps and side delts.', true, 'https://www.youtube.com/shorts/AWsGWt-VMl8');

  -- BICEPS (6 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Barbell Curl', biceps_id, 'Standing barbell curl for bicep mass.', true, 'https://www.youtube.com/shorts/54x2WF1_Suc'),
    ('Dumbbell Curl', biceps_id, 'Alternating or simultaneous dumbbell curls.', true, 'https://www.youtube.com/shorts/iui51E31sX8'),
    ('Hammer Curl', biceps_id, 'Neutral grip dumbbell curls for brachialis.', true, 'https://www.youtube.com/shorts/8H5oWMNWWeQ'),
    ('Preacher Curl', biceps_id, 'Preacher bench curl for bicep isolation.', true, 'https://www.youtube.com/shorts/Htw-s61mOw0'),
    ('Concentration Curl', biceps_id, 'Seated single-arm concentration curl.', true, 'https://www.youtube.com/shorts/EjUnEEfTSEY'),
    ('Cable Curl', biceps_id, 'Standing cable curl for constant tension.', true, 'https://www.youtube.com/shorts/CrbTqNOlFgE');

  -- TRICEPS (6 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Tricep Pushdown', triceps_id, 'Cable pushdown with rope or bar attachment.', true, 'https://www.youtube.com/shorts/Rc7-euA8FDI'),
    ('Skull Crushers', triceps_id, 'Lying tricep extension with EZ bar or dumbbells.', true, 'https://www.youtube.com/shorts/D1y1-sXZDA0'),
    ('Close-Grip Bench Press', triceps_id, 'Narrow grip bench press for tricep emphasis.', true, 'https://www.youtube.com/shorts/4yKLxOsrGfg'),
    ('Overhead Tricep Extension', triceps_id, 'Dumbbell or cable overhead extension.', true, 'https://www.youtube.com/shorts/b_r_LW4HEcM'),
    ('Tricep Dips', triceps_id, 'Upright dips emphasizing triceps.', true, 'https://www.youtube.com/shorts/9llvBAV4RHI'),
    ('Diamond Push-Ups', triceps_id, 'Close-hand push-ups targeting triceps.', true, 'https://www.youtube.com/shorts/PPTj-MW2tcs');

  -- LEGS (10 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Barbell Squat', legs_id, 'Back squat with barbell. King of leg exercises.', true, 'https://www.youtube.com/shorts/iZTxa8NJH2g'),
    ('Front Squat', legs_id, 'Front-loaded barbell squat for quads.', true, 'https://www.youtube.com/shorts/_qv0m3tPd3s'),
    ('Leg Press', legs_id, 'Machine leg press for quad and glute development.', true, 'https://www.youtube.com/shorts/nDh_BlnLCGc'),
    ('Romanian Deadlift', legs_id, 'Stiff-leg deadlift variation for hamstrings.', true, 'https://www.youtube.com/shorts/5rIqP63yWFg'),
    ('Leg Extension', legs_id, 'Machine leg extension for quad isolation.', true, 'https://www.youtube.com/shorts/uM86QE59Tgc'),
    ('Leg Curl', legs_id, 'Machine hamstring curl — lying or seated.', true, 'https://www.youtube.com/shorts/_lgE0gPvbik'),
    ('Bulgarian Split Squat', legs_id, 'Rear-foot elevated single-leg squat.', true, 'https://www.youtube.com/shorts/uODWo4YqbT8'),
    ('Walking Lunges', legs_id, 'Forward walking lunges with dumbbells or barbell.', true, 'https://www.youtube.com/shorts/1cS-6KsJW9g'),
    ('Calf Raises', legs_id, 'Standing or seated calf raises.', true, 'https://www.youtube.com/shorts/a-x_NR-ibos'),
    ('Hack Squat', legs_id, 'Machine hack squat for quad focus.', true, 'https://www.youtube.com/shorts/g9i05umL5vc');

  -- GLUTES (5 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Hip Thrust', glutes_id, 'Barbell hip thrust for glute activation and strength.', true, 'https://www.youtube.com/shorts/_i6qpcI1Nw4'),
    ('Glute Bridge', glutes_id, 'Bodyweight or weighted glute bridge.', true, 'https://www.youtube.com/shorts/X_IGw8U_e38'),
    ('Cable Kickback', glutes_id, 'Cable glute kickback for isolation.', true, 'https://www.youtube.com/shorts/A9aN_L4vexk'),
    ('Sumo Deadlift', glutes_id, 'Wide-stance deadlift emphasizing glutes and inner thighs.', true, 'https://www.youtube.com/shorts/e7oLkRlT2CQ'),
    ('Step-Ups', glutes_id, 'Weighted step-ups onto a box or bench.', true, 'https://www.youtube.com/shorts/8q9LVgN2RD4');

  -- CORE (7 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Plank', core_id, 'Isometric plank hold for core stability.', true, 'https://www.youtube.com/shorts/v25dawSzRTM'),
    ('Hanging Leg Raise', core_id, 'Hanging from bar, raise legs for lower abs.', true, 'https://www.youtube.com/shorts/XQc0WHO90Lk'),
    ('Cable Woodchop', core_id, 'Rotational cable movement for obliques.', true, 'https://www.youtube.com/shorts/BrXm1kg4SKI'),
    ('Ab Wheel Rollout', core_id, 'Ab wheel for full core engagement.', true, 'https://www.youtube.com/shorts/MinlHnG7j4k'),
    ('Russian Twist', core_id, 'Seated twist with weight for obliques.', true, 'https://www.youtube.com/shorts/iFQV6q4xRXM'),
    ('Crunches', core_id, 'Basic crunch for upper abs.', true, 'https://www.youtube.com/shorts/GSjm29FESiQ'),
    ('Dead Bug', core_id, 'Anti-extension core exercise for stability.', true, 'https://www.youtube.com/shorts/-8xqJ2xXs2A');

  -- CARDIO (5 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Treadmill Run', cardio_id, 'Running on treadmill at various speeds and inclines.', true, 'https://www.youtube.com/shorts/7HkQrFoufhc'),
    ('Rowing Machine', cardio_id, 'Full-body cardio on rowing ergometer.', true, 'https://www.youtube.com/shorts/bCxq4zMHpzs'),
    ('Cycling', cardio_id, 'Stationary bike or outdoor cycling.', true, 'https://www.youtube.com/shorts/dieOsJlsvpM'),
    ('Jump Rope', cardio_id, 'Skipping rope for cardiovascular conditioning.', true, 'https://www.youtube.com/shorts/Gt9hlRMXDXc'),
    ('Stair Climber', cardio_id, 'Stair climbing machine for leg endurance and cardio.', true, 'https://www.youtube.com/shorts/6mYp_BNYD5Y');

  -- FULL BODY (5 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved, video_url) values
    ('Burpees', full_body_id, 'Full-body explosive movement combining squat, push-up, and jump.', true, 'https://www.youtube.com/shorts/IU39YnTL3Pk'),
    ('Clean and Press', full_body_id, 'Barbell clean from floor to overhead press.', true, 'https://www.youtube.com/shorts/gzB8lu2MZ6Y'),
    ('Kettlebell Swing', full_body_id, 'Hip-hinge kettlebell swing for posterior chain and cardio.', true, 'https://www.youtube.com/shorts/RyPgfIvNvN0'),
    ('Turkish Get-Up', full_body_id, 'Complex floor-to-standing movement with weight overhead.', true, 'https://www.youtube.com/shorts/g5dwOlGGfmU'),
    ('Thrusters', full_body_id, 'Front squat into overhead press in one fluid movement.', true, 'https://www.youtube.com/shorts/XvhRYWgekT4');

  -- ============================================
  -- PRE-BUILT PROGRAMS
  -- ============================================

  -- PPL (Push Pull Legs)
  declare
    ppl_id uuid;
    ppl_push_id uuid;
    ppl_pull_id uuid;
    ppl_legs_id uuid;
  begin
    insert into public.programs (name, description, user_id, is_public)
    values ('Push Pull Legs', 'Classic 3-day split targeting push muscles, pull muscles, and legs. Great for intermediate lifters.', null, true)
    returning id into ppl_id;

    insert into public.program_workouts (program_id, name, day_order) values (ppl_id, 'Push Day', 1) returning id into ppl_push_id;
    insert into public.program_workouts (program_id, name, day_order) values (ppl_id, 'Pull Day', 2) returning id into ppl_pull_id;
    insert into public.program_workouts (program_id, name, day_order) values (ppl_id, 'Leg Day', 3) returning id into ppl_legs_id;

    -- Push Day exercises
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select ppl_push_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Barbell Bench Press', 4, 8, 1),
      ('Incline Dumbbell Press', 3, 10, 2),
      ('Overhead Press', 3, 10, 3),
      ('Lateral Raises', 3, 15, 4),
      ('Tricep Pushdown', 3, 12, 5),
      ('Overhead Tricep Extension', 3, 12, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;

    -- Pull Day exercises
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select ppl_pull_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Deadlift', 3, 5, 1),
      ('Barbell Row', 4, 8, 2),
      ('Lat Pulldown', 3, 10, 3),
      ('Face Pulls', 3, 15, 4),
      ('Barbell Curl', 3, 10, 5),
      ('Hammer Curl', 3, 12, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;

    -- Leg Day exercises
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select ppl_legs_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Barbell Squat', 4, 6, 1),
      ('Romanian Deadlift', 3, 10, 2),
      ('Leg Press', 3, 12, 3),
      ('Leg Curl', 3, 12, 4),
      ('Calf Raises', 4, 15, 5),
      ('Plank', 3, 60, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;
  end;

  -- Upper Lower Split
  declare
    ul_id uuid;
    ul_upper_id uuid;
    ul_lower_id uuid;
  begin
    insert into public.programs (name, description, user_id, is_public)
    values ('Upper Lower', '2-day split alternating upper and lower body. Perfect for beginners or those training 4 days/week.', null, true)
    returning id into ul_id;

    insert into public.program_workouts (program_id, name, day_order) values (ul_id, 'Upper Body', 1) returning id into ul_upper_id;
    insert into public.program_workouts (program_id, name, day_order) values (ul_id, 'Lower Body', 2) returning id into ul_lower_id;

    -- Upper Body
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select ul_upper_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Barbell Bench Press', 4, 8, 1),
      ('Barbell Row', 4, 8, 2),
      ('Overhead Press', 3, 10, 3),
      ('Lat Pulldown', 3, 10, 4),
      ('Dumbbell Curl', 3, 12, 5),
      ('Tricep Pushdown', 3, 12, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;

    -- Lower Body
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select ul_lower_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Barbell Squat', 4, 8, 1),
      ('Romanian Deadlift', 3, 10, 2),
      ('Leg Press', 3, 12, 3),
      ('Leg Curl', 3, 12, 4),
      ('Hip Thrust', 3, 10, 5),
      ('Calf Raises', 4, 15, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;
  end;

  -- Full Body Program
  declare
    fb_id uuid;
    fb_a_id uuid;
    fb_b_id uuid;
  begin
    insert into public.programs (name, description, user_id, is_public)
    values ('Full Body', 'Alternating full body workouts. Great for beginners training 3 days/week.', null, true)
    returning id into fb_id;

    insert into public.program_workouts (program_id, name, day_order) values (fb_id, 'Full Body A', 1) returning id into fb_a_id;
    insert into public.program_workouts (program_id, name, day_order) values (fb_id, 'Full Body B', 2) returning id into fb_b_id;

    -- Full Body A
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select fb_a_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Barbell Squat', 3, 8, 1),
      ('Barbell Bench Press', 3, 8, 2),
      ('Barbell Row', 3, 8, 3),
      ('Overhead Press', 3, 10, 4),
      ('Barbell Curl', 2, 12, 5),
      ('Plank', 3, 60, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;

    -- Full Body B
    insert into public.workout_exercises (program_workout_id, exercise_id, target_sets, target_reps, sort_order)
    select fb_b_id, e.id, v.sets, v.reps, v.ord
    from (values
      ('Deadlift', 3, 5, 1),
      ('Incline Dumbbell Press', 3, 10, 2),
      ('Pull-Ups', 3, 8, 3),
      ('Dumbbell Shoulder Press', 3, 10, 4),
      ('Hammer Curl', 2, 12, 5),
      ('Hanging Leg Raise', 3, 12, 6)
    ) as v(name, sets, reps, ord)
    join public.exercises e on e.name = v.name;
  end;

end $$;
