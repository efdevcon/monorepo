-- Add refund tracking columns to x402_completed_orders
-- refund_status: NULL (no refund), 'pending', 'confirmed', 'failed'
-- refund_tx_hash: on-chain refund transaction hash
-- refund_meta: JSON blob with amount, chainId, adminAddress, refundedAt, error

ALTER TABLE x402_completed_orders ADD COLUMN refund_status TEXT;
ALTER TABLE x402_completed_orders ADD COLUMN refund_tx_hash TEXT;
ALTER TABLE x402_completed_orders ADD COLUMN refund_meta JSONB;
