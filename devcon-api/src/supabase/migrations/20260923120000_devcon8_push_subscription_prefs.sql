-- Notification preferences per device: two flags on devcon8_push_subscriptions.
--   announcements: team announcements (default on: the switch people already
--     turned on was for announcements, so existing rows keep getting them).
--   reminders: "your starred session starts in 10 minutes" pushes (default
--     off: opt-in, set from the Notifications modal).
-- A row exists only while at least one flag is on; turning the last one off
-- unsubscribes the browser and deletes the row (event-app enforces this in
-- /api/push/subscriptions, PATCH rejects both-off).
--
-- The reminders filter lives INSIDE the claim function rather than in the
-- dispatcher's subscription fetch: the claim caps fresh rows per run
-- (p_limit), so filtering afterwards would spend the cap on accounts that
-- then receive nothing and write empty `sent` rows for them. The function
-- below is the 20260921120000 version verbatim except for `and p.reminders`
-- in the subscription check. The announcements filter is a plain
-- `announcements = true` in event-app's subscriber read (service.ts).
--
-- Idempotent: safe to re-run.

alter table devcon8_push_subscriptions
  add column if not exists announcements boolean not null default true;

alter table devcon8_push_subscriptions
  add column if not exists reminders boolean not null default false;

-- The claim's subscription check, narrowed to opted-in devices.
create index if not exists devcon8_push_subscriptions_reminders_idx
  on devcon8_push_subscriptions (user_id)
  where reminders and user_id is not null;

-- Atomic claim, called every minute by the dispatcher.
--   p_sessions: the sessions due RIGHT NOW as computed from the live
--     schedule, [{ session_id, session_start, send_at }].
--   p_stall_before: rows in `sending` older than this belong to a crashed run.
--   p_limit: at most this many fresh claims per call (time budget; the rest
--     are claimed on the next minute).
-- Claims one row per starred (interested = true) session of every account
-- that holds at least one push subscription with `reminders` on (the opt-in
-- flag added by this migration; an account whose devices all have it off
-- gets no row, so it costs none of p_limit). ON CONFLICT DO NOTHING plus
-- RETURNING hands back only the rows THIS caller inserted, so concurrent
-- dispatchers can never double-send. Returns
--   { fresh: [...], stalled: [...], skipped: n } with
--   { userId, sessionId, sessionStart } items.
create or replace function devcon8_session_reminders_claim(
  p_event text,
  p_sessions jsonb,
  p_stall_before timestamptz,
  p_limit integer
) returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_fresh jsonb;
  v_stalled jsonb;
  v_skipped integer;
begin
  -- A stalled claim whose session already started: retire it.
  update devcon8_session_reminders
     set status = 'skipped', updated_at = v_now
   where event = p_event
     and status = 'sending'
     and updated_at < p_stall_before
     and session_start <= v_now;
  get diagnostics v_skipped = row_count;

  -- Fresh claims. The NOT EXISTS keeps already-claimed pairs out of the LIMIT
  -- window (otherwise a page of conflicts could starve new claims); the
  -- ON CONFLICT is what makes concurrent callers safe.
  with due as (
    select s.session_id, s.session_start, s.send_at
      from jsonb_to_recordset(coalesce(p_sessions, '[]'::jsonb))
        as s(session_id text, session_start timestamptz, send_at timestamptz)
  ),
  ins as (
    insert into devcon8_session_reminders
      (user_id, event, session_id, session_start, send_at, status, created_at, updated_at)
    select i.user_id, p_event, d.session_id, d.session_start, d.send_at,
           'sending', v_now, v_now
      from due d
      join devcon8_interests i
        on i.event = p_event
       and i.kind = 'session'
       and i.item_id = d.session_id
       and i.interested
     where exists (
             select 1 from devcon8_push_subscriptions p
              where p.user_id = i.user_id
                and p.reminders
           )
       and not exists (
             select 1 from devcon8_session_reminders r
              where r.user_id = i.user_id
                and r.event = p_event
                and r.session_id = d.session_id
           )
     -- Soonest session first, so a cap never starves the one about to start.
     order by d.send_at, i.user_id
     limit p_limit
    on conflict (user_id, event, session_id) do nothing
    returning user_id, session_id, session_start
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', ins.user_id,
           'sessionId', ins.session_id,
           'sessionStart', ins.session_start
         )), '[]'::jsonb)
    into v_fresh
    from ins;

  -- Reclaim stalled rows whose session is still ahead (a crashed run).
  -- Fresh rows above carry updated_at = v_now, so they are never in here.
  with re as (
    update devcon8_session_reminders
       set updated_at = v_now
     where event = p_event
       and status = 'sending'
       and updated_at < p_stall_before
       and session_start > v_now
    returning user_id, session_id, session_start
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'userId', re.user_id,
           'sessionId', re.session_id,
           'sessionStart', re.session_start
         )), '[]'::jsonb)
    into v_stalled
    from re;

  return jsonb_build_object(
    'fresh', v_fresh,
    'stalled', v_stalled,
    'skipped', v_skipped
  );
end
$$;

revoke all on function devcon8_session_reminders_claim(text, jsonb, timestamptz, integer) from public;
revoke all on function devcon8_session_reminders_claim(text, jsonb, timestamptz, integer) from anon, authenticated;
