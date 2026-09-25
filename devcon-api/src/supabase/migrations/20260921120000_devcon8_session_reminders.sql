-- Session reminders: "your starred session starts in 15 minutes" web pushes,
-- sent by event-app (src/app/api/push/reminders.ts). One row per (account,
-- event, session). The row IS the claim: it is inserted the minute the
-- reminder falls due, so the primary key is the idempotency lock and there is
-- no "scheduled" state. `sending` becomes `sent` after the fan-out settles; a
-- crashed run leaves `sending`, which a later run reclaims after the
-- dispatcher's stall window while the session is still ahead, or retires as
-- `skipped` once the session has begun (nothing useful left to send).
-- Only the service-role key touches this table: RLS with no policies.

create table if not exists devcon8_session_reminders (
  user_id uuid not null,
  event text not null,
  session_id text not null,
  -- Slot start as seen at claim time. A slot that moves AFTER the reminder
  -- went out is not re-sent; this column is the audit trail for that.
  session_start timestamptz not null,
  -- session_start minus the lead time, as computed by the dispatcher.
  send_at timestamptz not null,
  status text not null default 'sending'
    check (status in ('sending', 'sent', 'skipped')),
  sent_ok integer not null default 0,
  sent_fail integer not null default 0,
  error_breakdown jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, event, session_id)
);

create index if not exists devcon8_session_reminders_stall_idx
  on devcon8_session_reminders (status, updated_at);

alter table devcon8_session_reminders enable row level security;

-- The claim below joins the due sessions to every account's stars and then to
-- that account's subscriptions, once a minute per event. Neither table had an
-- index for that side of the lookup (interests are keyed by user first,
-- subscriptions by endpoint), so both would be sequential scans.
create index if not exists devcon8_interests_event_item_idx
  on devcon8_interests (event, kind, item_id)
  where interested;

create index if not exists devcon8_push_subscriptions_user_idx
  on devcon8_push_subscriptions (user_id)
  where user_id is not null;

-- Atomic claim, called every minute by the dispatcher.
--   p_sessions: the sessions due RIGHT NOW as computed from the live
--     schedule, [{ session_id, session_start, send_at }].
--   p_stall_before: rows in `sending` older than this belong to a crashed run.
--   p_limit: at most this many fresh claims per call (time budget; the rest
--     are claimed on the next minute).
-- Claims one row per starred (interested = true) session of every account
-- that holds at least one push subscription. ON CONFLICT DO NOTHING plus
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
