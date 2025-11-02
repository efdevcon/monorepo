ALTER TABLE coupons ADD COLUMN ticket_used TEXT;

CREATE INDEX idx_coupons_ticket_used ON coupons(ticket_used);

COMMENT ON COLUMN coupons.ticket_used IS 'Identifier for which ticket was used to claim this coupon';
