-- Replace event_schema and collection columns with lexicon column

-- First, add the new lexicon column
ALTER TABLE atproto_records 
ADD COLUMN lexicon TEXT;

-- Make lexicon NOT NULL after data migration
ALTER TABLE atproto_records 
ALTER COLUMN lexicon SET NOT NULL;

-- Drop the old index on collection
DROP INDEX IF EXISTS idx_atproto_records_collection;

-- Drop the old columns
ALTER TABLE atproto_records 
DROP COLUMN IF EXISTS event_schema,
DROP COLUMN IF EXISTS collection;

-- Add comment for documentation
COMMENT ON COLUMN atproto_records.lexicon IS 'ATProto lexicon identifier for the record type';
