-- Add server-computed expected ETH amount in wei per chain for secure native ETH verification.
-- Used at verify time so we never trust client-supplied amounts.
ALTER TABLE x402_pending_orders
ADD COLUMN IF NOT EXISTS expected_eth_amount_wei_by_chain jsonb DEFAULT NULL;

COMMENT ON COLUMN x402_pending_orders.expected_eth_amount_wei_by_chain IS 'Expected ETH in wei per chain ID, e.g. {"8453":"1234567890123456789","10":"..."}. Set at order creation from totalUsd/ethPrice.';
