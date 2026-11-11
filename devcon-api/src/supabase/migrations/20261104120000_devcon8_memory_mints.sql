-- Devcon 8 Memories: the event app's free NFT perk (event-app/src/app/api/memory).
-- One row per checked-in ticket that asked for its memory, per chain. The app
-- server queues requests here and mints them in batches, one sponsored
-- operation per slot (a sponsored sender gets about one operation per block,
-- so minting one by one would stall under a rush).
--
-- ticket_key is keccak256("devcon8-memory:" || ticket secret), the same opaque
-- key the contract stores; the ticket secret itself is never stored. Only the
-- service-role key touches this table; RLS with no policies keeps the anon key
-- out.

create table if not exists devcon8_memory_mints (
  chain_id integer not null,
  ticket_key text not null,
  user_id uuid not null,
  -- Checksummed address the token goes to, and the ENS name typed, if any.
  recipient text not null,
  recipient_name text,
  -- queued: waiting for a batch; sending: claimed by a batch being sent;
  -- sent: in a submitted batch (call_id); minted: onchain (tx_hash, token_id,
  -- block_number);
  -- failed: gave up after repeated failures.
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'minted', 'failed')),
  call_id text,
  tx_hash text,
  token_id bigint,
  block_number bigint,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (chain_id, ticket_key)
);

create index if not exists devcon8_memory_mints_status_idx
  on devcon8_memory_mints (chain_id, status, created_at);

alter table devcon8_memory_mints enable row level security;

-- Claims up to p_max queued rows (oldest first) for one batch, atomically, so
-- two server instances never put the same ticket in two batches at once.
-- Rows left in 'sending' for over two minutes (a server that died mid-send)
-- go back to the queue first; resending them is harmless because the
-- contract skips tickets that already have a token.
create or replace function devcon8_memory_claim_batch(p_chain_id integer, p_max integer)
returns setof devcon8_memory_mints
language plpgsql
security definer
set search_path = public
as $$
begin
  update devcon8_memory_mints
     set status = 'queued', updated_at = now()
   where chain_id = p_chain_id
     and status = 'sending'
     and updated_at < now() - interval '2 minutes';

  return query
  update devcon8_memory_mints m
     set status = 'sending', attempts = m.attempts + 1, updated_at = now()
   where (m.chain_id, m.ticket_key) in (
     select q.chain_id, q.ticket_key
       from devcon8_memory_mints q
      where q.chain_id = p_chain_id and q.status = 'queued'
      order by q.created_at
      limit p_max
      for update skip locked
   )
  returning m.*;
end;
$$;

revoke all on function devcon8_memory_claim_batch(integer, integer) from public, anon, authenticated;
grant execute on function devcon8_memory_claim_batch(integer, integer) to service_role;
