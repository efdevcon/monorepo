-- Why a ticket link exists, so re-verification can check the reason still
-- holds: 'email' when the account chose one of the tickets under its own
-- email (the match was the proof; the link is dropped once the position's
-- attendee email no longer matches), 'qr' when it uploaded the ticket's QR
-- (possession stands regardless of the email). Rows created before this
-- column default to 'qr', the treatment that keeps them.

alter table devcon8_ticket_links
  add column if not exists proof text not null default 'qr'
  check (proof in ('email', 'qr'));
