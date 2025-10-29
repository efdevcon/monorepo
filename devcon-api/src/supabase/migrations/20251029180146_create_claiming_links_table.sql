-- Create devconnect_app_claiming_links table
CREATE TABLE devconnect_app_claiming_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link TEXT NOT NULL,
    amount NUMERIC(20, 6),
    claimed_by_user_email TEXT REFERENCES devconnect_app_user(email),
    claimed_by_address TEXT,
    claimed_date TIMESTAMP WITH TIME ZONE,
    ticket_secret_proof TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure link is unique
    CONSTRAINT unique_claiming_link UNIQUE(link),
    -- Ensure each field is individually unique
    CONSTRAINT unique_ticket_secret_proof UNIQUE(ticket_secret_proof),
    CONSTRAINT unique_claimed_by_user_email UNIQUE(claimed_by_user_email)
);

-- Create indexes for performance
CREATE INDEX idx_claiming_links_link ON devconnect_app_claiming_links(link);
CREATE INDEX idx_claiming_links_claimed_by_user_email ON devconnect_app_claiming_links(claimed_by_user_email);
CREATE INDEX idx_claiming_links_claimed_by_address ON devconnect_app_claiming_links(claimed_by_address);
CREATE INDEX idx_claiming_links_claimed_date ON devconnect_app_claiming_links(claimed_date);
CREATE INDEX idx_claiming_links_created_at ON devconnect_app_claiming_links(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_devconnect_app_claiming_links_updated_at 
    BEFORE UPDATE ON devconnect_app_claiming_links 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE devconnect_app_claiming_links IS 'Stores claiming links for devconnect app with claim tracking';
COMMENT ON COLUMN devconnect_app_claiming_links.link IS 'The unique claiming link URL';
COMMENT ON COLUMN devconnect_app_claiming_links.amount IS 'Amount to be claimed';
COMMENT ON COLUMN devconnect_app_claiming_links.claimed_by_user_email IS 'Email of the user who claimed this link';
COMMENT ON COLUMN devconnect_app_claiming_links.claimed_by_address IS 'Ethereum address that claimed this link';
COMMENT ON COLUMN devconnect_app_claiming_links.claimed_date IS 'Timestamp when the link was claimed';
COMMENT ON COLUMN devconnect_app_claiming_links.ticket_secret_proof IS 'Proof or secret code associated with the ticket claim';
