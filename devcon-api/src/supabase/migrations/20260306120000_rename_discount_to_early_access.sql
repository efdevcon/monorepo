-- Rename discount tables to early_access
ALTER TABLE devcon8_discount_codes RENAME TO devcon8_early_access_codes;
ALTER TABLE devcon8_discount_vouchers RENAME TO devcon8_early_access_vouchers;

-- Rename indexes
ALTER INDEX idx_devcon8_discount_codes_collection RENAME TO idx_devcon8_early_access_codes_collection;
ALTER INDEX idx_devcon8_discount_codes_unclaimed RENAME TO idx_devcon8_early_access_codes_unclaimed;
ALTER INDEX idx_devcon8_discount_vouchers_unassigned RENAME TO idx_devcon8_early_access_vouchers_unassigned;

-- Rename foreign key constraint
ALTER TABLE devcon8_early_access_codes
    RENAME CONSTRAINT fk_devcon8_discount_codes_voucher TO fk_devcon8_early_access_codes_voucher;
