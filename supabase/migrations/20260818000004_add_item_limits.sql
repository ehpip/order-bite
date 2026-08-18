ALTER TABLE public.store_items
ADD COLUMN IF NOT EXISTS "limit" INT CHECK ("limit" IS NULL OR "limit" >= 0);

ALTER TABLE public.menu_snapshot_items
ADD COLUMN IF NOT EXISTS "limit" INT CHECK ("limit" IS NULL OR "limit" >= 0);
