-- Create devconnect_app_user table
CREATE TABLE devconnect_app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    addresses TEXT[] DEFAULT '{}',
    additional_ticket_emails TEXT[] DEFAULT '{}',
    favorite_events TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_devconnect_app_user_email ON devconnect_app_user(email);

-- Add RLS (Row Level Security) policies
ALTER TABLE devconnect_app_user ENABLE ROW LEVEL SECURITY;

-- Policy: Users can perform all operations on their own rows (where email matches)
CREATE POLICY "Users can manage their own data" 
ON devconnect_app_user 
FOR ALL 
USING (email = auth.email()) 
WITH CHECK (email = auth.email());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_devconnect_app_user_updated_at 
    BEFORE UPDATE ON devconnect_app_user 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
