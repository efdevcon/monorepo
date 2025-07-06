-- Add zk_proof_id column to coupons table
ALTER TABLE coupons ADD COLUMN zk_proof_id TEXT;

-- Create index for performance on zk_proof_id lookups
CREATE INDEX idx_coupons_zk_proof_id ON coupons(zk_proof_id);

-- Add comment for documentation
COMMENT ON COLUMN coupons.zk_proof_id IS 'ZK proof identifier used to match coupons to specific proof types (e.g. "Devcon SEA")';
