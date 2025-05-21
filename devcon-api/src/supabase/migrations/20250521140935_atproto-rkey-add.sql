-- Update atproto-events table to add missing columns
ALTER TABLE IF EXISTS "atproto-events"
  DROP COLUMN "lexicon",
  ADD COLUMN IF NOT EXISTS "rkey" text,
  ADD COLUMN IF NOT EXISTS "rev" text,
  ADD COLUMN IF NOT EXISTS "record" jsonb,
  ADD COLUMN IF NOT EXISTS "message" jsonb,
  ADD COLUMN IF NOT EXISTS "collection" text,
  ADD CONSTRAINT "atproto-events_rkey_key" UNIQUE ("rkey");

-- Create index on collection for better query performance
CREATE INDEX IF NOT EXISTS "atproto-events_collection_idx" ON "atproto-events" ("collection");

-- Update the saveEvent function in server.ts to match the new schema
COMMENT ON TABLE "atproto-events" IS 'Stores events from the AT Protocol firehose'; 