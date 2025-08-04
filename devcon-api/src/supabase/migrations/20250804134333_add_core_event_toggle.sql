ALTER TABLE atproto_records 
ADD COLUMN is_core_event BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN atproto_records.is_core_event IS 'Whether the event is a core event';