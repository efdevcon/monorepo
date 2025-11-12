-- Change quests column from TEXT[] to JSONB to store questId: completedAt mappings

-- First, drop the existing default
ALTER TABLE devconnect_app_user 
ALTER COLUMN quests DROP DEFAULT;

-- Change column type to JSONB
-- USING clause converts empty TEXT[] '{}' to empty JSONB '{}'
ALTER TABLE devconnect_app_user 
ALTER COLUMN quests TYPE JSONB USING '{}';

-- Set new default value as JSONB
ALTER TABLE devconnect_app_user 
ALTER COLUMN quests SET DEFAULT '{}'::jsonb;

-- Update comment
COMMENT ON COLUMN devconnect_app_user.quests IS 'Map of quest IDs to completion timestamps (questId: completedAt)';
