-- Add email column to track which email address the voucher was sent to
ALTER TABLE devcon8_early_access_vouchers
    ADD COLUMN email TEXT;
