-- ─────────────────────────────────────────────────────────────────────────────
-- 00014_fix_notification_trigger_fatal.sql
--
-- Problem: handle_coach_client_notification is an AFTER trigger. If anything
-- inside it raises an exception (e.g. v_coach_user_id is NULL because the
-- coach has no matching public.users row, or the notifications table insert
-- fails for any reason), PostgreSQL rolls back the entire triggering statement
-- — meaning the coach_clients INSERT itself is silently undone.
--
-- Fix: wrap the notification logic in EXCEPTION WHEN OTHERS so failures are
-- non-fatal. The relationship row is the important thing; notifications are
-- a best-effort side effect.
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- Resolve coach's user_id and display name
  select cp.user_id, u.display_name
  into   v_coach_user_id, v_coach_name
  from   public.coach_profiles cp
  left join public.users u on u.id = cp.user_id
  where  cp.id = NEW.coach_id;

  -- Resolve client's display name
  select display_name
  into   v_client_name
  from   public.users
  where  id = NEW.client_id;

  -- Guard: if coach user can't be resolved, skip notification rather than
  -- rolling back the coach_clients row.
  if v_coach_user_id is null then
    return NEW;
  end if;

  -- Wrap all notification inserts in an exception handler so any failure
  -- (constraint, missing table, etc.) never rolls back the parent INSERT.
  begin

    -- ── INSERT: a new relationship was created ────────────────────────────
    if TG_OP = 'INSERT' then

      if NEW.initiated_by = 'coach' then
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

    -- ── UPDATE: status changed ────────────────────────────────────────────
    elsif TG_OP = 'UPDATE' then

      if OLD.status = 'pending' and NEW.status != OLD.status then

        if NEW.status = 'active' then
          if NEW.initiated_by = 'coach' then
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
          if NEW.initiated_by = 'coach' then
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

  exception when others then
    -- Notification failure must never block the relationship write.
    -- Swallow the error and let the transaction succeed.
    null;
  end;

  return NEW;
end;
$$;
