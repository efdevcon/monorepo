ALTER TABLE atproto_records 
ADD COLUMN admin_override JSONB;

-- Add comment for documentation
COMMENT ON COLUMN atproto_records.admin_override IS 'JSON blob of admin override data';