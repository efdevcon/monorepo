-- Modify atproto-events table to match new data structure
ALTER TABLE "atproto-events"
    DROP COLUMN "uri",
    DROP COLUMN "cid",
    DROP COLUMN "author",
    DROP COLUMN "data",
    ADD COLUMN "record" jsonb,
    ADD COLUMN "message" jsonb;

-- Drop old indexes that are no longer needed
DROP INDEX IF EXISTS "atproto-events_uri_idx";
DROP INDEX IF EXISTS "atproto-events_author_idx";

-- Create new index for record field
CREATE INDEX IF NOT EXISTS "atproto-events_record_idx" ON "atproto-events" USING gin ("record");
