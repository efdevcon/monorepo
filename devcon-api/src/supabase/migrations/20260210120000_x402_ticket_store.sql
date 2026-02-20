-- x402 ticket store: pending and completed orders (shared across serverless invocations)
CREATE TABLE x402_pending_orders (
  payment_reference TEXT PRIMARY KEY,
  order_data JSONB NOT NULL,
  total_usd TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  metadata JSONB
);

CREATE INDEX idx_x402_pending_orders_expires_at ON x402_pending_orders(expires_at);

CREATE TABLE x402_completed_orders (
  payment_reference TEXT PRIMARY KEY,
  pretix_order_code TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  payer TEXT NOT NULL,
  completed_at BIGINT NOT NULL
);

CREATE INDEX idx_x402_completed_orders_pretix_code ON x402_completed_orders(pretix_order_code);

ALTER TABLE x402_pending_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE x402_completed_orders ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE x402_pending_orders IS 'Pending x402 ticket orders between purchase and payment verification';
COMMENT ON TABLE x402_completed_orders IS 'Completed x402 ticket orders after payment verification';
