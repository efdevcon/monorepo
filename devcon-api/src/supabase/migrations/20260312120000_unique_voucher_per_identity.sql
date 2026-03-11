-- Prevent the same identity from being assigned multiple vouchers.
-- PostgreSQL allows multiple NULLs in a unique index, so unassigned vouchers are unaffected.
CREATE UNIQUE INDEX idx_devcon8_early_access_vouchers_one_per_identity
ON devcon8_early_access_vouchers(assigned_to)
WHERE assigned_to IS NOT NULL;
