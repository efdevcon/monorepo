-- Add email_sent column to track whether the voucher email was successfully delivered
ALTER TABLE devcon8_early_access_vouchers
    ADD COLUMN email_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark existing rows that already have an email as sent
UPDATE devcon8_early_access_vouchers
    SET email_sent = TRUE
    WHERE email IS NOT NULL;
