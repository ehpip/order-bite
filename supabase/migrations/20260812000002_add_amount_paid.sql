-- Add amount_paid column to track the grand_total at the time payment was locked (reported or confirmed paid)
-- Add payment_reset_notice column that already exists in the app logic
ALTER TABLE public.member_orders
ADD COLUMN IF NOT EXISTS amount_paid BIGINT DEFAULT NULL;

ALTER TABLE public.member_orders
ADD COLUMN IF NOT EXISTS payment_reset_notice BOOLEAN NOT NULL DEFAULT FALSE;
