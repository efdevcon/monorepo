-- x402 payment security hardening
-- 1. Unique constraint on tx_hash prevents double-spend (same tx used for multiple orders)
-- 2. Add expected_chain_id column to pending orders for chain validation at verify time

-- Prevent the same transaction from completing multiple orders
ALTER TABLE x402_completed_orders
  ADD CONSTRAINT x402_completed_orders_tx_hash_unique UNIQUE (tx_hash);

-- Store the expected chain ID so verify can reject cross-chain tx reuse
ALTER TABLE x402_pending_orders
  ADD COLUMN IF NOT EXISTS expected_chain_id integer;
