-- delete_account(): lets an authenticated user permanently erase their own data.
--
-- What is DELETED (personal data only):
--   auth.users row → cascades to public.users → phases → phase_schedule
--                                              → workout_sessions → session_sets
--                                              → body_weight_logs
--                                              → push_subscriptions
--                                              → notifications
--                                              → exercise_submissions
--                                              → coach_profiles / coach_clients
--
-- What is KEPT (community / shared data):
--   programs    — user_id set to NULL so the program template survives
--   exercises   — submitted_by already uses ON DELETE SET NULL (no action needed)
--
-- Must be SECURITY DEFINER so the function can touch auth.users (restricted schema).
-- The search_path pin prevents search-path injection attacks.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Preserve community programs: NULL out the owner reference so the CASCADE
  -- from auth.users deletion does not take programs with it.
  update public.programs
  set    user_id = null
  where  user_id = v_uid;

  -- Removing the auth.users row cascades to public.users and from there to
  -- every table that carries an ON DELETE CASCADE FK back to it.
  delete from auth.users where id = v_uid;
end;
$$;

-- Only the authenticated user who owns the account may call this.
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
