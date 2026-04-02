-- RepFlow Coaching Platform
-- Migration: coach profiles, clients, macro targets, program assignments, subscriptions, agreements

-- ============================================
-- COACH PROFILES (extends users into coaches)
-- ============================================
create table public.coach_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  bio text not null default '',
  experience text not null default '',
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended')),
  max_clients integer not null default 25,
  monthly_rate decimal,
  created_at timestamptz not null default now()
);

alter table public.coach_profiles enable row level security;

-- Anyone can browse approved coaches
create policy "Approved coaches readable by all authenticated users"
  on public.coach_profiles for select
  to authenticated
  using (status = 'approved');

-- Coach can read own profile regardless of status
create policy "Coach can read own profile"
  on public.coach_profiles for select
  to authenticated
  using (user_id = auth.uid());

-- Any user can apply to be a coach
create policy "Users can create own coach profile"
  on public.coach_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

-- Coach can update own profile (except status)
create policy "Coach can update own profile"
  on public.coach_profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status = (select status from public.coach_profiles where user_id = auth.uid())
  );

-- Admins can manage all coach profiles
create policy "Admins can manage all coach profiles"
  on public.coach_profiles for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_coach_profiles_user on public.coach_profiles(user_id);
create index idx_coach_profiles_status on public.coach_profiles(status);

-- ============================================
-- COACH CLIENTS (coach-client relationships)
-- ============================================
create table public.coach_clients (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  client_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  initiated_by text not null check (initiated_by in ('coach', 'client')),
  started_at date,
  expires_at date,
  price decimal,
  notes text,
  created_at timestamptz not null default now(),
  unique(coach_id, client_id)
);

alter table public.coach_clients enable row level security;

-- Coach can read their own client relationships
create policy "Coach can read own clients"
  on public.coach_clients for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id and cp.user_id = auth.uid()
    )
  );

-- Client can read their own coaching relationships
create policy "Client can read own coaching relationships"
  on public.coach_clients for select
  to authenticated
  using (client_id = auth.uid());

-- Coach can invite clients (initiated_by = 'coach')
create policy "Coach can invite clients"
  on public.coach_clients for insert
  to authenticated
  with check (
    initiated_by = 'coach'
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id
      and cp.user_id = auth.uid()
      and cp.status = 'approved'
      and (select count(*) from public.coach_clients cc where cc.coach_id = cp.id and cc.status = 'active') < cp.max_clients
    )
  );

-- Client can request a coach (initiated_by = 'client')
create policy "Client can request a coach"
  on public.coach_clients for insert
  to authenticated
  with check (
    initiated_by = 'client'
    and client_id = auth.uid()
    and exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id
      and cp.status = 'approved'
      and (select count(*) from public.coach_clients cc where cc.coach_id = cp.id and cc.status = 'active') < cp.max_clients
    )
  );

-- Coach can update client relationships
create policy "Coach can update client relationships"
  on public.coach_clients for update
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id and cp.user_id = auth.uid()
    )
  );

-- Client can update own coaching status
create policy "Client can update own coaching status"
  on public.coach_clients for update
  to authenticated
  using (client_id = auth.uid());

-- Admins can manage all
create policy "Admins can manage all coach clients"
  on public.coach_clients for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_coach_clients_coach on public.coach_clients(coach_id);
create index idx_coach_clients_client on public.coach_clients(client_id);

-- ============================================
-- MACRO TARGETS (coach-set nutrition targets)
-- ============================================
create table public.macro_targets (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references public.coach_clients(id) on delete cascade,
  protein decimal not null,
  carbs decimal not null,
  fat decimal not null,
  effective_date date not null,
  created_at timestamptz not null default now()
);

alter table public.macro_targets enable row level security;

-- Coach can manage macro targets for own clients
create policy "Coach can manage macro targets for own clients"
  on public.macro_targets for all
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.id = coach_client_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Client can read own macro targets
create policy "Client can read own macro targets"
  on public.macro_targets for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.id = coach_client_id
      and cc.client_id = auth.uid()
    )
  );

-- Admins can manage all
create policy "Admins can manage all macro targets"
  on public.macro_targets for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_macro_targets_client_date on public.macro_targets(coach_client_id, effective_date desc);

-- ============================================
-- COACH PROGRAM ASSIGNMENTS
-- ============================================
create table public.coach_program_assignments (
  id uuid primary key default uuid_generate_v4(),
  coach_client_id uuid not null references public.coach_clients(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  duration_weeks integer,
  started_at date not null,
  ended_at date,
  status text not null default 'active' check (status in ('active', 'completed', 'swapped')),
  created_at timestamptz not null default now()
);

alter table public.coach_program_assignments enable row level security;

-- Coach can manage assignments for own clients
create policy "Coach can manage program assignments for own clients"
  on public.coach_program_assignments for all
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.id = coach_client_id
      and cp.user_id = auth.uid()
    )
  );

-- Client can read own program assignments
create policy "Client can read own program assignments"
  on public.coach_program_assignments for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.id = coach_client_id
      and cc.client_id = auth.uid()
    )
  );

-- Admins can manage all
create policy "Admins can manage all program assignments"
  on public.coach_program_assignments for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_coach_program_assignments_client on public.coach_program_assignments(coach_client_id);

-- ============================================
-- COACH SUBSCRIPTIONS (admin-managed revenue tracking)
-- ============================================
create table public.coach_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  base_fee decimal not null,
  per_client_fee decimal not null default 0,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  current_period_start date not null,
  current_period_end date not null,
  created_at timestamptz not null default now()
);

alter table public.coach_subscriptions enable row level security;

-- Coach can read own subscription
create policy "Coach can read own subscription"
  on public.coach_subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.id = coach_id and cp.user_id = auth.uid()
    )
  );

-- Admins can manage all subscriptions
create policy "Admins can manage all subscriptions"
  on public.coach_subscriptions for all
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

-- ============================================
-- USER AGREEMENTS (ToS and waiver tracking)
-- ============================================
create table public.user_agreements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_type text not null check (document_type in ('tos', 'coaching_waiver')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  unique(user_id, document_type, document_version)
);

alter table public.user_agreements enable row level security;

-- Users can read own agreements
create policy "Users can read own agreements"
  on public.user_agreements for select
  to authenticated
  using (user_id = auth.uid());

-- Users can accept agreements
create policy "Users can accept agreements"
  on public.user_agreements for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins can read all agreements
create policy "Admins can read all agreements"
  on public.user_agreements for select
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and is_admin = true));

create index idx_user_agreements_user on public.user_agreements(user_id);

-- ============================================
-- COACH ACCESS TO EXISTING CLIENT DATA
-- ============================================

-- Coach can read client body weight logs
create policy "Coach can read client body weight logs"
  on public.body_weight_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = user_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client workout sessions
create policy "Coach can read client workout sessions"
  on public.workout_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = user_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client session sets
create policy "Coach can read client session sets"
  on public.session_sets for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      join public.coach_clients cc on cc.client_id = ws.user_id
      join public.coach_profiles cp on cp.id = cc.coach_id
      where ws.id = session_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client phases
create policy "Coach can read client phases"
  on public.phases for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = user_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client phase schedules
create policy "Coach can read client phase schedules"
  on public.phase_schedule for select
  to authenticated
  using (
    exists (
      select 1 from public.phases ph
      join public.coach_clients cc on cc.client_id = ph.user_id
      join public.coach_profiles cp on cp.id = cc.coach_id
      where ph.id = phase_id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Coach can read client user profiles
create policy "Coach can read client profiles"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_clients cc
      join public.coach_profiles cp on cp.id = cc.coach_id
      where cc.client_id = id
      and cp.user_id = auth.uid()
      and cc.status = 'active'
    )
  );

-- Client can read coach assigned programs
create policy "Client can read coach assigned programs"
  on public.programs for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_program_assignments cpa
      join public.coach_clients cc on cc.id = cpa.coach_client_id
      where cpa.program_id = id
      and cc.client_id = auth.uid()
    )
  );
