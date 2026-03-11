-- Add env column to x402 tables for dev/prod isolation
ALTER TABLE x402_pending_orders ADD COLUMN env TEXT NOT NULL DEFAULT 'development';
ALTER TABLE x402_completed_orders ADD COLUMN env TEXT NOT NULL DEFAULT 'development';

-- Index for monitoring UI queries filtered by env
CREATE INDEX idx_x402_pending_orders_env ON x402_pending_orders (env);
CREATE INDEX idx_x402_completed_orders_env ON x402_completed_orders (env);
