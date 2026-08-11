-- Announcements for the event-app: authored in Notion, synced by
-- event-app /api/announcements/refresh (see event-app/src/app/api/announcements/).
-- Postgres is the system of record for the push-delivery lifecycle (Phase 2);
-- Notion is only the writing surface. Server access uses the service-role key.

create table if not exists devcon8_announcements (
  -- Notion page id (dashed uuid). Using it as the PK keeps authoring and
  -- delivery joined without an id mapping.
  id text primary key,
  title text not null,
  message text not null default '',
  url text,
  send_at timestamptz not null,
  -- Whether the row should also go out as a web push (Phase 2). Inbox-only
  -- announcements keep this false.
  push boolean not null default false,
  -- Mirrors the Notion "Visible" checkbox; unchecking (or deleting the row in
  -- Notion) soft-hides it from the feed without losing delivery history.
  visible boolean not null default true,
  -- Push lifecycle. The sync only ever moves draft <-> scheduled; the Phase 2
  -- dispatcher owns sending/sent and those rows are never re-armed by a sync.
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent')),
  sent_ok integer not null default 0,
  sent_fail integer not null default 0,
  error_breakdown jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists devcon8_announcements_feed_idx on devcon8_announcements (visible, send_at desc);
create index if not exists devcon8_announcements_dispatch_idx on devcon8_announcements (status, send_at);

-- Only the server's service-role key touches this table; no anon policies.
alter table devcon8_announcements enable row level security;
