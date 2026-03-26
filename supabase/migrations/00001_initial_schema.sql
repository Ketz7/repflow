-- RepFlow Database Schema
-- Initial migration: all core tables + RLS policies

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS PROFILE (extends Supabase auth.users)
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- MUSCLE GROUPS
-- ============================================
create table public.muscle_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text not null default '💪',
  sort_order int not null default 0
);

alter table public.muscle_groups enable row level security;

create policy "Muscle groups are readable by all authenticated users"
  on public.muscle_groups for select
  to authenticated
  using (true);

-- ============================================
-- EXERCISES (global, admin-curated)
-- ============================================
create table public.exercises (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  muscle_group_id uuid not null references public.muscle_groups(id) on delete cascade,
  youtube_url text,
  description text not null default '',
  is_approved boolean not null default false,
  submitted_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Approved exercises readable by all authenticated users"
  on public.exercises for select
  to authenticated
  using (is_approved = true);

create policy "Admins can read all exercises"
  on public.exercises for select
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create policy "Admins can insert exercises"
  on public.exercises for insert
  to authenticated
  with check (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create policy "Admins can update exercises"
  on public.exercises for update
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create policy "Admins can delete exercises"
  on public.exercises for delete
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- PROGRAMS (templates)
-- ============================================
create table public.programs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  user_id uuid references public.users(id) on delete cascade,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.programs enable row level security;

create policy "Public programs readable by all authenticated users"
  on public.programs for select
  to authenticated
  using (is_public = true);

create policy "Users can read own programs"
  on public.programs for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create own programs"
  on public.programs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own programs"
  on public.programs for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete own programs"
  on public.programs for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Admins can manage public programs"
  on public.programs for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- PROGRAM WORKOUTS (workouts within a program)
-- ============================================
create table public.program_workouts (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  day_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.program_workouts enable row level security;

create policy "Users can read workouts of accessible programs"
  on public.program_workouts for select
  to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id
      and (p.is_public = true or p.user_id = auth.uid())
    )
  );

create policy "Users can manage workouts of own programs"
  on public.program_workouts for all
  to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

create policy "Admins can manage all program workouts"
  on public.program_workouts for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- WORKOUT EXERCISES (exercises in a workout template)
-- ============================================
create table public.workout_exercises (
  id uuid primary key default uuid_generate_v4(),
  program_workout_id uuid not null references public.program_workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  target_sets int not null default 3,
  target_reps int not null default 10,
  sort_order int not null default 0
);

alter table public.workout_exercises enable row level security;

create policy "Users can read workout exercises of accessible programs"
  on public.workout_exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.program_workouts pw
      join public.programs p on p.id = pw.program_id
      where pw.id = program_workout_id
      and (p.is_public = true or p.user_id = auth.uid())
    )
  );

create policy "Users can manage workout exercises of own programs"
  on public.workout_exercises for all
  to authenticated
  using (
    exists (
      select 1 from public.program_workouts pw
      join public.programs p on p.id = pw.program_id
      where pw.id = program_workout_id and p.user_id = auth.uid()
    )
  );

create policy "Admins can manage all workout exercises"
  on public.workout_exercises for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- PHASES (8-week blocks)
-- ============================================
create table public.phases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.phases enable row level security;

create policy "Users can manage own phases"
  on public.phases for all
  to authenticated
  using (user_id = auth.uid());

-- ============================================
-- PHASE SCHEDULE (which workout on which day)
-- ============================================
create table public.phase_schedule (
  id uuid primary key default uuid_generate_v4(),
  phase_id uuid not null references public.phases(id) on delete cascade,
  program_workout_id uuid not null references public.program_workouts(id) on delete cascade,
  scheduled_date date not null,
  sort_order int not null default 0
);

alter table public.phase_schedule enable row level security;

create policy "Users can manage own phase schedules"
  on public.phase_schedule for all
  to authenticated
  using (
    exists (
      select 1 from public.phases ph
      where ph.id = phase_id and ph.user_id = auth.uid()
    )
  );

-- ============================================
-- WORKOUT SESSIONS (actual logged workouts)
-- ============================================
create table public.workout_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  program_workout_id uuid references public.program_workouts(id) on delete set null,
  phase_id uuid references public.phases(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users can manage own sessions"
  on public.workout_sessions for all
  to authenticated
  using (user_id = auth.uid());

-- ============================================
-- SESSION SETS (individual sets logged)
-- ============================================
create table public.session_sets (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number int not null,
  reps_completed int not null default 0,
  weight_used decimal,
  created_at timestamptz not null default now()
);

alter table public.session_sets enable row level security;

create policy "Users can manage own session sets"
  on public.session_sets for all
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

-- ============================================
-- BODY WEIGHT LOGS
-- ============================================
create table public.body_weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  weight decimal not null,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table public.body_weight_logs enable row level security;

create policy "Users can manage own weight logs"
  on public.body_weight_logs for all
  to authenticated
  using (user_id = auth.uid());

-- ============================================
-- EXERCISE SUBMISSIONS (pending review)
-- ============================================
create table public.exercise_submissions (
  id uuid primary key default uuid_generate_v4(),
  submitted_by uuid not null references public.users(id) on delete cascade,
  name text not null,
  muscle_group_id uuid not null references public.muscle_groups(id) on delete cascade,
  youtube_url text,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.exercise_submissions enable row level security;

create policy "Users can read own submissions"
  on public.exercise_submissions for select
  to authenticated
  using (submitted_by = auth.uid());

create policy "Users can create submissions"
  on public.exercise_submissions for insert
  to authenticated
  with check (submitted_by = auth.uid());

create policy "Admins can manage all submissions"
  on public.exercise_submissions for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_exercises_muscle_group on public.exercises(muscle_group_id);
create index idx_exercises_approved on public.exercises(is_approved);
create index idx_programs_user on public.programs(user_id);
create index idx_programs_public on public.programs(is_public);
create index idx_program_workouts_program on public.program_workouts(program_id);
create index idx_workout_exercises_workout on public.workout_exercises(program_workout_id);
create index idx_phases_user on public.phases(user_id);
create index idx_phases_active on public.phases(user_id, is_active);
create index idx_phase_schedule_phase on public.phase_schedule(phase_id);
create index idx_phase_schedule_date on public.phase_schedule(scheduled_date);
create index idx_workout_sessions_user on public.workout_sessions(user_id);
create index idx_session_sets_session on public.session_sets(session_id);
create index idx_body_weight_user_date on public.body_weight_logs(user_id, date);
create index idx_exercise_submissions_status on public.exercise_submissions(status);
