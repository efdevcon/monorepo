-- Add chain_id, total_usd, token_symbol, and crypto_amount to completed orders for admin monitoring
ALTER TABLE x402_completed_orders ADD COLUMN chain_id INTEGER;
ALTER TABLE x402_completed_orders ADD COLUMN total_usd TEXT;
ALTER TABLE x402_completed_orders ADD COLUMN token_symbol TEXT;
ALTER TABLE x402_completed_orders ADD COLUMN crypto_amount TEXT;
ALTER TABLE x402_completed_orders ADD COLUMN gas_cost_wei TEXT;
