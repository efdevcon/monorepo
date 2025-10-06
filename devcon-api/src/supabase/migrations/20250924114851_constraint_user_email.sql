-- Change primary key from id to email for devconnect_app_user table

-- First, drop the existing primary key constraint on id
ALTER TABLE devconnect_app_user DROP CONSTRAINT devconnect_app_user_pkey;

-- Add primary key constraint on email
ALTER TABLE devconnect_app_user ADD PRIMARY KEY (email);

-- Drop the id column since it's no longer needed
ALTER TABLE devconnect_app_user DROP COLUMN id;

-- Drop the now-redundant email index since primary keys automatically create an index
DROP INDEX IF EXISTS idx_devconnect_app_user_email;
