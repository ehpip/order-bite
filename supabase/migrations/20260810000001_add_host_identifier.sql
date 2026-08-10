-- Adds host_identifier TEXT column to order_sessions for non-logged-in host ownership.
-- host_id UUID remains for REFERENCES auth.users(id) (OAuth/signed-in hosts only).
-- host_identifier TEXT stores the device ID / email / auth user UUID for ownership matching.

ALTER TABLE public.order_sessions
  ADD COLUMN IF NOT EXISTS host_identifier TEXT;

CREATE INDEX IF NOT EXISTS idx_order_sessions_host_identifier
  ON public.order_sessions(host_identifier);
