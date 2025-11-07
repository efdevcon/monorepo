-- Create ticket cache table to reduce load on Pretix stores
CREATE TABLE IF NOT EXISTS ticket_cache (
  email text PRIMARY KEY,
  ticket_data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for checking cache expiration (8 hours)
CREATE INDEX idx_ticket_cache_updated_at ON ticket_cache(updated_at);
