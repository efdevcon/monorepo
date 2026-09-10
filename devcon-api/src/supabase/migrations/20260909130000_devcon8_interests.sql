-- "Interested" stars synced to the event-app account. The device (Dexie)
-- stays the source of truth; this table is the meeting point between
-- a user's devices. One row per (account, event, kind, item), kept as a
-- tombstone (interested = false) when unstarred so the removal wins elsewhere.
--
-- updated_at is the device's change time in ms and decides conflicts (last
-- write wins per item). synced_at is the server's write time and is the sync
-- cursor, so a device with a wrong clock never misses another device's change.
-- Only the service-role key touches this table; RLS with no policies keeps the
-- anon key out.

create table if not exists devcon8_interests (
  user_id uuid not null,
  event text not null,
  kind text not null check (kind in ('session', 'speaker')),
  item_id text not null,
  interested boolean not null,
  updated_at bigint not null,
  synced_at timestamptz not null,
  primary key (user_id, event, kind, item_id)
);

create index if not exists devcon8_interests_cursor_idx
  on devcon8_interests (user_id, event, synced_at);

alter table devcon8_interests enable row level security;

-- Merge a device's pending changes (last write wins per item), then return
-- every row of the account for this event written since p_since (all rows
-- when null) together with the server clock to use as the next cursor.
create or replace function devcon8_interests_sync(
  p_user_id uuid,
  p_event text,
  p_since timestamptz,
  p_changes jsonb
) returns jsonb
language plpgsql
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_rows jsonb;
begin
  insert into devcon8_interests (user_id, event, kind, item_id, interested, updated_at, synced_at)
  select p_user_id, p_event, c.kind, c.item_id, c.interested, c.updated_at, v_now
  from jsonb_to_recordset(coalesce(p_changes, '[]'::jsonb))
    as c(kind text, item_id text, interested boolean, updated_at bigint)
  on conflict (user_id, event, kind, item_id) do update
    set interested = excluded.interested,
        updated_at = excluded.updated_at,
        synced_at = v_now
    where excluded.updated_at > devcon8_interests.updated_at;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'kind', r.kind,
      'id', r.item_id,
      'interested', r.interested,
      'updatedAt', r.updated_at
    )),
    '[]'::jsonb
  )
  into v_rows
  from devcon8_interests r
  where r.user_id = p_user_id
    and r.event = p_event
    and (p_since is null or r.synced_at > p_since);

  return jsonb_build_object(
    'changes', v_rows,
    'now', (extract(epoch from v_now) * 1000)::bigint
  );
end
$$;

revoke all on function devcon8_interests_sync(uuid, text, timestamptz, jsonb) from public;
revoke all on function devcon8_interests_sync(uuid, text, timestamptz, jsonb) from anon, authenticated;
