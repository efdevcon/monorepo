-- Web push subscriptions for the event-app (Phase 2 of announcements).
-- One row per browser push endpoint. The endpoint URL is the natural PK:
-- re-subscribing the same browser upserts instead of erroring (a Devcon SEA
-- bug), and rotation (pushsubscriptionchange) replaces the row keyed by the
-- old endpoint. Only the service-role key touches this table.

create table if not exists devcon8_push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  -- Supabase auth user who subscribed; kept for later targeting/debugging.
  user_id uuid,
  -- True when the subscriber signed in with an @ethereum.org account; the
  -- test-send path delivers only to these rows.
  is_team boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  -- Bumped on non-410 delivery failures, reset on success; rows are deleted
  -- once this crosses the dispatcher's threshold (dead endpoint).
  consecutive_failures integer not null default 0
);

alter table devcon8_push_subscriptions enable row level security;
