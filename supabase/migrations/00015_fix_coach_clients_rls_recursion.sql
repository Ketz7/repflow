-- ─────────────────────────────────────────────────────────────────────────────
-- 00015_fix_coach_clients_rls_recursion.sql
--
-- Problem: both INSERT WITH CHECK policies on coach_clients contain:
--   (select count(*) from public.coach_clients cc where ...)
-- PostgreSQL evaluates RLS on that inner SELECT, which re-enters the same
-- policy evaluation context → 42P17 infinite recursion.
--
-- Fix: extract the count into a SECURITY DEFINER function. SECURITY DEFINER
-- runs as the DB owner, bypassing RLS entirely, breaking the cycle.
-- Same pattern used by is_admin() and find_user_by_email().
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: returns the number of active clients for a given coach profile.
-- SECURITY DEFINER bypasses coach_clients RLS so this never recurses.
create or replace function public.get_coach_active_client_count(p_coach_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from public.coach_clients
  where coach_id = p_coach_id
    and status = 'active';
$$;

-- Recreate the two INSERT policies using the helper instead of inline subquery.

drop policy if exists "Coach can invite clients" on public.coach_clients;
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
        and public.get_coach_active_client_count(cp.id) < cp.max_clients
    )
  );

drop policy if exists "Client can request a coach" on public.coach_clients;
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
        and public.get_coach_active_client_count(cp.id) < cp.max_clients
    )
  );
