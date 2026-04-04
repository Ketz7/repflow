-- Sprint 2: User goals, weekly session target, onboarding flag

alter table public.users
  add column if not exists goal text
    check (goal in ('strength', 'hypertrophy', 'fat_loss', 'maintenance')),
  add column if not exists weekly_session_goal integer default 3
    check (weekly_session_goal between 1 and 7),
  -- Default TRUE so existing users skip onboarding; new users get FALSE via trigger below
  add column if not exists onboarding_completed boolean not null default true;

-- New users should see the onboarding wizard
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url, onboarding_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    false
  );
  return new;
end;
$$ language plpgsql security definer;
