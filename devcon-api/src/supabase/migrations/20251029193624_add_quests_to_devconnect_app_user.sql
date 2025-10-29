-- Add ticket_secrets and quests columns to devconnect_app_user table
ALTER TABLE devconnect_app_user 
ADD COLUMN quests TEXT[] DEFAULT '{}';

-- Comments for documentation
COMMENT ON COLUMN devconnect_app_user.quests IS 'Array of quest identifiers completed by the user';
