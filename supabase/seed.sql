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
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Barbell Bench Press', chest_id, 'Flat bench press with barbell. Primary chest builder.', true),
    ('Incline Dumbbell Press', chest_id, 'Incline bench press with dumbbells targeting upper chest.', true),
    ('Decline Bench Press', chest_id, 'Decline angle bench press targeting lower chest.', true),
    ('Dumbbell Flyes', chest_id, 'Flat bench flyes for chest stretch and contraction.', true),
    ('Cable Crossover', chest_id, 'Standing cable flyes for constant tension on chest.', true),
    ('Push-Ups', chest_id, 'Bodyweight push-ups. Versatile chest and tricep exercise.', true),
    ('Chest Dips', chest_id, 'Leaning forward dips emphasizing chest.', true),
    ('Machine Chest Press', chest_id, 'Guided chest press machine for isolation.', true);

  -- BACK (9 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Deadlift', back_id, 'Conventional deadlift. Compound movement for entire posterior chain.', true),
    ('Barbell Row', back_id, 'Bent-over barbell row targeting mid-back.', true),
    ('Pull-Ups', back_id, 'Bodyweight pull-ups for lats and upper back.', true),
    ('Lat Pulldown', back_id, 'Cable lat pulldown for lat width.', true),
    ('Seated Cable Row', back_id, 'Seated row with cable for mid-back thickness.', true),
    ('Dumbbell Row', back_id, 'Single-arm dumbbell row for unilateral back work.', true),
    ('T-Bar Row', back_id, 'T-bar row for mid-back thickness.', true),
    ('Face Pulls', back_id, 'Cable face pulls for rear delts and upper back health.', true),
    ('Hyperextensions', back_id, 'Back extension for lower back strength.', true);

  -- SHOULDERS (7 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Overhead Press', shoulders_id, 'Standing barbell overhead press. Primary shoulder builder.', true),
    ('Dumbbell Shoulder Press', shoulders_id, 'Seated or standing dumbbell shoulder press.', true),
    ('Lateral Raises', shoulders_id, 'Dumbbell lateral raises for side delts.', true),
    ('Front Raises', shoulders_id, 'Dumbbell front raises for anterior delts.', true),
    ('Reverse Flyes', shoulders_id, 'Bent-over reverse flyes for rear delts.', true),
    ('Arnold Press', shoulders_id, 'Rotational dumbbell press hitting all delt heads.', true),
    ('Upright Row', shoulders_id, 'Barbell or dumbbell upright row for traps and side delts.', true);

  -- BICEPS (6 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Barbell Curl', biceps_id, 'Standing barbell curl for bicep mass.', true),
    ('Dumbbell Curl', biceps_id, 'Alternating or simultaneous dumbbell curls.', true),
    ('Hammer Curl', biceps_id, 'Neutral grip dumbbell curls for brachialis.', true),
    ('Preacher Curl', biceps_id, 'Preacher bench curl for bicep isolation.', true),
    ('Concentration Curl', biceps_id, 'Seated single-arm concentration curl.', true),
    ('Cable Curl', biceps_id, 'Standing cable curl for constant tension.', true);

  -- TRICEPS (6 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Tricep Pushdown', triceps_id, 'Cable pushdown with rope or bar attachment.', true),
    ('Skull Crushers', triceps_id, 'Lying tricep extension with EZ bar or dumbbells.', true),
    ('Close-Grip Bench Press', triceps_id, 'Narrow grip bench press for tricep emphasis.', true),
    ('Overhead Tricep Extension', triceps_id, 'Dumbbell or cable overhead extension.', true),
    ('Tricep Dips', triceps_id, 'Upright dips emphasizing triceps.', true),
    ('Diamond Push-Ups', triceps_id, 'Close-hand push-ups targeting triceps.', true);

  -- LEGS (10 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Barbell Squat', legs_id, 'Back squat with barbell. King of leg exercises.', true),
    ('Front Squat', legs_id, 'Front-loaded barbell squat for quads.', true),
    ('Leg Press', legs_id, 'Machine leg press for quad and glute development.', true),
    ('Romanian Deadlift', legs_id, 'Stiff-leg deadlift variation for hamstrings.', true),
    ('Leg Extension', legs_id, 'Machine leg extension for quad isolation.', true),
    ('Leg Curl', legs_id, 'Machine hamstring curl — lying or seated.', true),
    ('Bulgarian Split Squat', legs_id, 'Rear-foot elevated single-leg squat.', true),
    ('Walking Lunges', legs_id, 'Forward walking lunges with dumbbells or barbell.', true),
    ('Calf Raises', legs_id, 'Standing or seated calf raises.', true),
    ('Hack Squat', legs_id, 'Machine hack squat for quad focus.', true);

  -- GLUTES (5 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Hip Thrust', glutes_id, 'Barbell hip thrust for glute activation and strength.', true),
    ('Glute Bridge', glutes_id, 'Bodyweight or weighted glute bridge.', true),
    ('Cable Kickback', glutes_id, 'Cable glute kickback for isolation.', true),
    ('Sumo Deadlift', glutes_id, 'Wide-stance deadlift emphasizing glutes and inner thighs.', true),
    ('Step-Ups', glutes_id, 'Weighted step-ups onto a box or bench.', true);

  -- CORE (7 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Plank', core_id, 'Isometric plank hold for core stability.', true),
    ('Hanging Leg Raise', core_id, 'Hanging from bar, raise legs for lower abs.', true),
    ('Cable Woodchop', core_id, 'Rotational cable movement for obliques.', true),
    ('Ab Wheel Rollout', core_id, 'Ab wheel for full core engagement.', true),
    ('Russian Twist', core_id, 'Seated twist with weight for obliques.', true),
    ('Crunches', core_id, 'Basic crunch for upper abs.', true),
    ('Dead Bug', core_id, 'Anti-extension core exercise for stability.', true);

  -- CARDIO (5 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Treadmill Run', cardio_id, 'Running on treadmill at various speeds and inclines.', true),
    ('Rowing Machine', cardio_id, 'Full-body cardio on rowing ergometer.', true),
    ('Cycling', cardio_id, 'Stationary bike or outdoor cycling.', true),
    ('Jump Rope', cardio_id, 'Skipping rope for cardiovascular conditioning.', true),
    ('Stair Climber', cardio_id, 'Stair climbing machine for leg endurance and cardio.', true);

  -- FULL BODY (5 exercises)
  insert into public.exercises (name, muscle_group_id, description, is_approved) values
    ('Burpees', full_body_id, 'Full-body explosive movement combining squat, push-up, and jump.', true),
    ('Clean and Press', full_body_id, 'Barbell clean from floor to overhead press.', true),
    ('Kettlebell Swing', full_body_id, 'Hip-hinge kettlebell swing for posterior chain and cardio.', true),
    ('Turkish Get-Up', full_body_id, 'Complex floor-to-standing movement with weight overhead.', true),
    ('Thrusters', full_body_id, 'Front squat into overhead press in one fluid movement.', true);

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
