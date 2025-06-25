-- Add message column as JSON blob to atproto_records table
ALTER TABLE atproto_records 
ADD COLUMN message JSONB;

-- Add comment for documentation
COMMENT ON COLUMN atproto_records.message IS 'JSON blob containing message data';
