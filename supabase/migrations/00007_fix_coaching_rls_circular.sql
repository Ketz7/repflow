-- Fix circular RLS dependency in coaching platform
-- Problem: users → coach_clients → users → infinite recursion
-- Solution: SECURITY DEFINER function for admin checks bypasses RLS

-- ============================================
-- Step 1: Create admin check function (bypasses RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- ============================================
-- Step 2: Drop ALL circular policies on coaching tables
-- ============================================

-- Drop admin policies that query users table (these cause the circular dependency)
DROP POLICY IF EXISTS "Admins can manage all coach profiles" ON public.coach_profiles;
DROP POLICY IF EXISTS "Admins can manage all coach clients" ON public.coach_clients;
DROP POLICY IF EXISTS "Admins can manage all macro targets" ON public.macro_targets;
DROP POLICY IF EXISTS "Admins can manage all program assignments" ON public.coach_program_assignments;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.coach_subscriptions;
DROP POLICY IF EXISTS "Admins can read all agreements" ON public.user_agreements;

-- Drop the policies on existing tables that query coaching tables (other half of the cycle)
DROP POLICY IF EXISTS "Coach can read client body weight logs" ON public.body_weight_logs;
DROP POLICY IF EXISTS "Coach can read client workout sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "Coach can read client session sets" ON public.session_sets;
DROP POLICY IF EXISTS "Coach can read client phases" ON public.phases;
DROP POLICY IF EXISTS "Coach can read client phase schedules" ON public.phase_schedule;
DROP POLICY IF EXISTS "Coach can read client profiles" ON public.users;
DROP POLICY IF EXISTS "Client can read coach assigned programs" ON public.programs;

-- ============================================
-- Step 3: Recreate admin policies using is_admin() function
-- ============================================

CREATE POLICY "Admins can manage all coach profiles"
  ON public.coach_profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage all coach clients"
  ON public.coach_clients FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage all macro targets"
  ON public.macro_targets FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage all program assignments"
  ON public.coach_program_assignments FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage all subscriptions"
  ON public.coach_subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can read all agreements"
  ON public.user_agreements FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- Step 4: Recreate coach access policies on existing tables
-- These now work because the coaching tables' admin policies
-- use is_admin() instead of querying users table directly
-- ============================================

-- Coach can read client body weight logs
CREATE POLICY "Coach can read client body weight logs"
  ON public.body_weight_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      JOIN public.coach_profiles cp ON cp.id = cc.coach_id
      WHERE cc.client_id = body_weight_logs.user_id
      AND cp.user_id = auth.uid()
      AND cc.status = 'active'
    )
  );

-- Coach can read client workout sessions
CREATE POLICY "Coach can read client workout sessions"
  ON public.workout_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      JOIN public.coach_profiles cp ON cp.id = cc.coach_id
      WHERE cc.client_id = workout_sessions.user_id
      AND cp.user_id = auth.uid()
      AND cc.status = 'active'
    )
  );

-- Coach can read client session sets
CREATE POLICY "Coach can read client session sets"
  ON public.session_sets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.coach_clients cc ON cc.client_id = ws.user_id
      JOIN public.coach_profiles cp ON cp.id = cc.coach_id
      WHERE ws.id = session_sets.session_id
      AND cp.user_id = auth.uid()
      AND cc.status = 'active'
    )
  );

-- Coach can read client phases
CREATE POLICY "Coach can read client phases"
  ON public.phases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      JOIN public.coach_profiles cp ON cp.id = cc.coach_id
      WHERE cc.client_id = phases.user_id
      AND cp.user_id = auth.uid()
      AND cc.status = 'active'
    )
  );

-- Coach can read client phase schedules
CREATE POLICY "Coach can read client phase schedules"
  ON public.phase_schedule FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.phases ph
      JOIN public.coach_clients cc ON cc.client_id = ph.user_id
      JOIN public.coach_profiles cp ON cp.id = cc.coach_id
      WHERE ph.id = phase_schedule.phase_id
      AND cp.user_id = auth.uid()
      AND cc.status = 'active'
    )
  );

-- Coach can read client user profiles
CREATE POLICY "Coach can read client profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      JOIN public.coach_profiles cp ON cp.id = cc.coach_id
      WHERE cc.client_id = users.id
      AND cp.user_id = auth.uid()
      AND cc.status = 'active'
    )
  );

-- Client can read coach assigned programs
CREATE POLICY "Client can read coach assigned programs"
  ON public.programs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_program_assignments cpa
      JOIN public.coach_clients cc ON cc.id = cpa.coach_client_id
      WHERE cpa.program_id = programs.id
      AND cc.client_id = auth.uid()
    )
  );
