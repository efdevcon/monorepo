-- Tickets an event-app account has proven it holds, by uploading the ticket's
-- QR code or by choosing one of the tickets already under its email.
-- One row per (account, event, Pretix order position). The QR payload itself is
-- never stored: secret_hash is a SHA-256 of it, enough to recognise a code that
-- was already attached. Only the service-role key touches this table; RLS with
-- no policies keeps the anon key out.

create table if not exists devcon8_ticket_links (
  user_id uuid not null,
  -- Pretix event slug the position belongs to (the app is configured per event).
  event text not null,
  position_id bigint not null,
  secret_hash text not null,
  attached_at timestamptz not null default now(),
  primary key (user_id, event, position_id)
);

create index if not exists devcon8_ticket_links_position_idx
  on devcon8_ticket_links (event, position_id);

alter table devcon8_ticket_links enable row level security;
