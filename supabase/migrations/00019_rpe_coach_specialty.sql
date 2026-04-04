-- Sprint 4: RPE per set + coach specialty for marketplace filtering

-- RPE (Rate of Perceived Exertion, 1-10) on each logged set
alter table public.session_sets
  add column if not exists rpe smallint check (rpe between 1 and 10);

-- Specialty tags on coach profiles (e.g. '{strength,fat_loss}')
alter table public.coach_profiles
  add column if not exists specialty text[] not null default '{}';
