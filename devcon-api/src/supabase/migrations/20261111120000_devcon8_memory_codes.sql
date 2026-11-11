-- Devcon 8 Memory claim codes, for the devcon.org survey (devcon/src/services/memory).
--
-- One code per checked-in Devcon 8 ticket, emailed to its attendee
-- (devcon/src/scripts/send-memory-codes.ts). Only the code's SHA-256 is
-- stored. ticket_key is the same key devcon8_memory_mints and the contract
-- use (keccak256("devcon8-memory:" || ticket secret)), so a ticket gets one
-- memory whichever way it is claimed.
--
-- Service role only: RLS on, no policies.

create table if not exists devcon8_memory_codes (
  code_hash text primary key,
  ticket_key text not null unique,
  email text not null,
  attendee_name text,
  created_at timestamptz not null default now(),
  -- The email with the code went out (the send script skips these).
  emailed_at timestamptz,
  -- First mint request with this code.
  claimed_at timestamptz
);

alter table devcon8_memory_codes enable row level security;

-- Survey mints have no app account: the code is the claim.
alter table devcon8_memory_mints alter column user_id drop not null;
