ALTER TABLE atproto_records 
ADD COLUMN comments TEXT,
ADD COLUMN reviewed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN atproto_records.comments IS 'Comments from the user';
COMMENT ON COLUMN atproto_records.reviewed IS 'Whether the event has been reviewed since last update';