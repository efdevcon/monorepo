ALTER TABLE atproto_records 
ADD COLUMN priority INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN atproto_records.priority IS 'Priority of the event on the calendar';