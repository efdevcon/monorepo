-- Test sends from Notion. Until now the only way to see an announcement on a
-- phone before everyone got it was a developer calling the team test route;
-- editors could not rehearse on their own. Two checkboxes on the Notion DB
-- now send a row to a small audience: "Test push (team)" to every team
-- device (devcon8_push_subscriptions.is_team), "Test push (product team)" to
-- the product team's accounts only. Each audience keeps its own send state
-- here, so a test never consumes the row's one real send
-- (devcon8_announcements.status) and ignores Visible and Send At.
--
-- `status` follows the checkbox edge, not its level: the sync arms a row
-- (`scheduled`) when the box goes from unticked to ticked, so re-ticking a
-- finished test runs it again, while a box that stays ticked sends once.
-- Unticking cancels a `scheduled` test and leaves `sending`/`sent` alone
-- (rules in event-app src/app/api/announcements/testPush.ts). The minute
-- dispatcher claims `status = 'scheduled' and flag`, exactly like the real
-- send, with the same stall window for crashed runs.
--
-- Additive: the deployed code never touches this table, so apply this
-- BEFORE deploying the code that does. Idempotent: safe to re-run.
create table if not exists devcon8_announcement_tests (
  announcement_id text not null references devcon8_announcements (id) on delete cascade,
  audience text not null check (audience in ('team', 'product')),
  -- The Notion checkbox as last synced; the edge detection compares against it.
  flag boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent')),
  sent_ok integer,
  sent_fail integer,
  error_breakdown jsonb,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (announcement_id, audience)
);

-- No policies on purpose: only the server (service role) reads or writes it,
-- like the other devcon8_* tables.
alter table devcon8_announcement_tests enable row level security;

create index if not exists devcon8_announcement_tests_due_idx
  on devcon8_announcement_tests (status)
  where flag;

-- The product-team audience: the devices of a list of accounts, matched on
-- the auth email. Subscriptions carry only the user id, and auth.users is
-- out of reach for PostgREST roles, so this runs as its owner (definer) with
-- a pinned search_path and is callable by the service role only. Returns the
-- same columns the dispatcher reads for every other audience.
create or replace function devcon8_push_subscriptions_for_emails(p_emails text[])
returns table (endpoint text, p256dh text, auth text, user_id uuid, is_team boolean)
language sql
security definer
set search_path = ''
as $$
  select s.endpoint, s.p256dh, s.auth, s.user_id, s.is_team
  from public.devcon8_push_subscriptions s
  join auth.users u on u.id = s.user_id
  where lower(u.email) = any (select lower(e) from unnest(p_emails) as e)
$$;

revoke all on function devcon8_push_subscriptions_for_emails(text[]) from public;
revoke all on function devcon8_push_subscriptions_for_emails(text[]) from anon, authenticated;
-- Explicit rather than left to the project's default privileges, so the grant
-- holds on any database this file is applied to.
grant execute on function devcon8_push_subscriptions_for_emails(text[]) to service_role;
