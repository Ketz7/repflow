-- ─────────────────────────────────────────────────────────────────────────────
-- 00011_notifications.sql
-- In-app notification system for coach/client invite flows
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table ─────────────────────────────────────────────────────────────────────
create table public.notifications (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        not null references public.users(id) on delete cascade,
  type            text        not null check (type in (
                                'coach_invite',    -- coach invited a client
                                'client_request',  -- client requested a coach
                                'invite_accepted', -- the other party accepted
                                'invite_declined'  -- the other party declined
                              )),
  title           text        not null,
  body            text        not null,
  link            text        not null,   -- relative path, e.g. '/coach/dashboard'
  is_read         boolean     not null default false,
  coach_client_id uuid        references public.coach_clients(id) on delete cascade,
  created_at      timestamptz not null default now()
);

-- Fast lookup for unread count + ordered list per user
create index idx_notifications_user_unread
  on public.notifications(user_id, is_read, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Users can mark their own notifications as read (no other fields)
create policy "Users can mark own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can do everything (consistent with rest of schema)
create policy "Admins can manage notifications"
  on public.notifications for all
  to authenticated
  using (public.is_admin());

-- ── Trigger function ──────────────────────────────────────────────────────────
-- SECURITY DEFINER so inserts bypass RLS (same pattern as find_user_by_email)
create or replace function public.handle_coach_client_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_user_id uuid;
  v_coach_name    text;
  v_client_name   text;
begin
  -- Resolve coach's user_id and display name from coach_profiles
  select cp.user_id, u.display_name
  into   v_coach_user_id, v_coach_name
  from   public.coach_profiles cp
  join   public.users u on u.id = cp.user_id
  where  cp.id = NEW.coach_id;

  -- Resolve client's display name
  select display_name
  into   v_client_name
  from   public.users
  where  id = NEW.client_id;

  -- ── INSERT: a new relationship was created ──────────────────────────────────
  if TG_OP = 'INSERT' then

    if NEW.initiated_by = 'coach' then
      -- Notify the CLIENT that a coach invited them
      insert into public.notifications
        (user_id, type, title, body, link, coach_client_id)
      values (
        NEW.client_id,
        'coach_invite',
        'New coaching invite',
        coalesce(v_coach_name, 'A coach') || ' wants to be your coach.',
        '/coaches/' || NEW.coach_id::text,
        NEW.id
      );

    elsif NEW.initiated_by = 'client' then
      -- Notify the COACH that a client requested them
      insert into public.notifications
        (user_id, type, title, body, link, coach_client_id)
      values (
        v_coach_user_id,
        'client_request',
        'New client request',
        coalesce(v_client_name, 'A client') || ' wants you as their coach.',
        '/coach/dashboard',
        NEW.id
      );
    end if;

  -- ── UPDATE OF status: relationship status changed ──────────────────────────
  elsif TG_OP = 'UPDATE' then

    -- Only act when status actually transitions from pending
    if OLD.status = 'pending' and NEW.status != OLD.status then

      if NEW.status = 'active' then
        -- Someone accepted — notify the original initiator
        if NEW.initiated_by = 'coach' then
          -- Client accepted coach's invite → notify coach
          insert into public.notifications
            (user_id, type, title, body, link, coach_client_id)
          values (
            v_coach_user_id,
            'invite_accepted',
            'Invitation accepted',
            coalesce(v_client_name, 'Your client') || ' accepted your coaching invitation.',
            '/coach/dashboard',
            NEW.id
          );
        else
          -- Coach accepted client's request → notify client
          insert into public.notifications
            (user_id, type, title, body, link, coach_client_id)
          values (
            NEW.client_id,
            'invite_accepted',
            'Request accepted',
            coalesce(v_coach_name, 'Your coach') || ' accepted your coaching request.',
            '/profile',
            NEW.id
          );
        end if;

      elsif NEW.status = 'expired' then
        -- Someone declined — notify the original initiator
        if NEW.initiated_by = 'coach' then
          -- Client declined coach's invite → notify coach
          insert into public.notifications
            (user_id, type, title, body, link, coach_client_id)
          values (
            v_coach_user_id,
            'invite_declined',
            'Invitation declined',
            coalesce(v_client_name, 'The client') || ' declined your coaching invitation.',
            '/coach/dashboard',
            NEW.id
          );
        else
          -- Coach declined client's request → notify client
          insert into public.notifications
            (user_id, type, title, body, link, coach_client_id)
          values (
            NEW.client_id,
            'invite_declined',
            'Request declined',
            coalesce(v_coach_name, 'The coach') || ' declined your coaching request.',
            '/coaches',
            NEW.id
          );
        end if;
      end if;

    end if;
  end if;

  return NEW;
end;
$$;

-- Fire after INSERT or only status-column UPDATE to avoid noise on other edits
create trigger trg_coach_client_notification
  after insert or update of status
  on public.coach_clients
  for each row
  execute function public.handle_coach_client_notification();

-- ── Enable Supabase Realtime ───────────────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
