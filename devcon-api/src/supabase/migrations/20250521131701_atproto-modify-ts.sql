-- Modify atproto-events table to match new data structure
ALTER TABLE "atproto-events"
    DROP COLUMN "timestamp",
    ADD COLUMN "cursor" text;