-- ─────────────────────────────────────────────────────────────────────────────
-- 00022_fix_users_update_rls_recursion.sql
--
-- Problem: onboarding "Let's go" button returns
--   42P17 infinite recursion detected in policy for relation "users"
--
-- Root cause: migration 00004 added a WITH CHECK on the users UPDATE policy
-- that contains a subquery on public.users:
--
--   WITH CHECK (
--     auth.uid() = id
--     AND is_admin = (SELECT is_admin FROM public.users WHERE id = auth.uid())
--   );
--
-- PostgreSQL's RLS recursion guard is table-level: the moment any policy on
-- public.users runs a subquery that touches public.users again, Postgres throws
-- 42P17 — even if the SELECT policy would not actually loop.
--
-- Fix: replace the inline subquery with the existing public.is_admin()
-- SECURITY DEFINER function (introduced in 00007). SECURITY DEFINER runs as
-- the DB owner so RLS is bypassed inside it, breaking the cycle.
-- Same pattern used by is_admin() and get_coach_active_client_count().
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = public.is_admin()
  );
