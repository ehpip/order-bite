ALTER TABLE public.order_sessions
  ADD COLUMN IF NOT EXISTS description TEXT;
