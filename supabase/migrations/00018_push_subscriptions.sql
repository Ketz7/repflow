-- Sprint 3: Web push subscriptions

create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  -- One subscription endpoint per user (upsert key)
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all subscriptions (for Edge Function)
create policy "Service role can read all push subscriptions"
  on public.push_subscriptions for select
  to service_role
  using (true);
