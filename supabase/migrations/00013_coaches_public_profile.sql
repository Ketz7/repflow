-- ─────────────────────────────────────────────────────────────────────────────
-- 00013_coaches_public_profile.sql
-- Fix: coaches list page shows "Coach" instead of the coach's real name.
--
-- Root cause: the users table has no policy letting a regular client read
-- another user's profile. The coaches/page.tsx query does a lateral join
-- user:users(display_name, avatar_url) — PostgREST evaluates users RLS for
-- the calling client, the join comes back null, and the UI falls back to
-- the hardcoded string "Coach".
--
-- Fix: allow any authenticated user to read the users row for an approved
-- coach. Scoped tightly — only rows where a coach_profiles entry with
-- status='approved' exists for that user_id.
-- ─────────────────────────────────────────────────────────────────────────────

create policy "Approved coach user profiles are readable by all authenticated users"
  on public.users for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_profiles cp
      where cp.user_id = users.id
        and cp.status = 'approved'
    )
  );
