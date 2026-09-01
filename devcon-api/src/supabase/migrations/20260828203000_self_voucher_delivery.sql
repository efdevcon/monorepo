-- Durable handoff between the two halves of the Self/Aadhaar verification flow.
--
-- Self's backend POSTs a verified proof to /api/tickets/redeem-self, which
-- assigns a voucher and then has to hand the code to the buyer's browser. That
-- handoff was an in-memory Map on the serverless instance that happened to
-- serve the POST, while the browser polls /api/tickets/self-voucher, a separate
-- invocation that can land on a different instance (or a cold one). When they
-- disagree the buyer sees "Verification timed out" even though the proof was
-- accepted and a voucher was already burned on their nullifier — observed in
-- production 2026-08-28 19:01:46Z, where the voucher existed but never reached
-- the browser.
--
-- Keyed by the FRONTEND-generated user_id (UUID v4, ~122 bits, held only by the
-- originating browser session and echoed inside the proof's userContextData),
-- deliberately NOT by assigned_to. An earlier Supabase fallback keyed on
-- assigned_to was removed because nullifiers and emails are knowable by third
-- parties, which made it an unauthenticated oracle for voucher codes. A random
-- per-session UUID is not enumerable, so the lookup stays a secret-bearer read.
create table if not exists devcon8_self_voucher_delivery (
  user_id text primary key,
  voucher_code text,
  error_reason text,
  created_at timestamptz not null default now(),
  -- Short-lived by design: this is a handoff buffer, not a record of truth
  -- (devcon8_early_access_vouchers.assigned_to remains that). Reads ignore
  -- expired rows and the API deletes them opportunistically.
  expires_at timestamptz not null default now() + interval '30 minutes'
);

-- Supports the expiry filter on read and the opportunistic cleanup delete.
create index if not exists devcon8_self_voucher_delivery_expires_idx
  on devcon8_self_voucher_delivery (expires_at);

-- Service-role only: every access goes through the Next.js API routes, never
-- the browser. No policies are defined, so RLS denies anon/authenticated.
alter table devcon8_self_voucher_delivery enable row level security;
