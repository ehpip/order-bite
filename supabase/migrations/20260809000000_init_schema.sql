-- Group Food Ordering Database Schema (Supabase PostgreSQL)
-- Includes Stores, Categories, Menu Items, Menu Snapshots, Sessions, Orders, and RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STORES
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo TEXT,
  cover_image TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. STORE CATEGORIES
CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. STORE ITEMS
CREATE TABLE IF NOT EXISTS public.store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  image TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 1,
  sku TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MENU SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.menu_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name TEXT NOT NULL,
  store_logo TEXT,
  store_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MENU SNAPSHOT ITEMS
CREATE TABLE IF NOT EXISTS public.menu_snapshot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.menu_snapshots(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL DEFAULT 'General',
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  image TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  original_item_id UUID
);

-- 6. ORDER SESSIONS
CREATE TABLE IF NOT EXISTS public.order_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_name TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  menu_snapshot_id UUID NOT NULL REFERENCES public.menu_snapshots(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  share_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
  deadline TIMESTAMPTZ NOT NULL,
  shipping_cost BIGINT NOT NULL DEFAULT 0,
  shipping_split_method TEXT NOT NULL DEFAULT 'equal' CHECK (shipping_split_method IN ('equal', 'proportional', 'host')),
  payment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 7. MEMBER ORDERS
CREATE TABLE IF NOT EXISTS public.member_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.order_sessions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  food_subtotal BIGINT NOT NULL DEFAULT 0,
  shipping_share BIGINT NOT NULL DEFAULT 0,
  grand_total BIGINT NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'payment_reported', 'paid')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, member_id)
);

-- 8. MEMBER ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.member_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.member_orders(id) ON DELETE CASCADE,
  snapshot_item_id UUID NOT NULL REFERENCES public.menu_snapshot_items(id) ON DELETE RESTRICT,
  item_name TEXT NOT NULL,
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  notes TEXT,
  subtotal BIGINT NOT NULL CHECK (subtotal >= 0)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_store_items_store ON public.store_items(store_id);
CREATE INDEX IF NOT EXISTS idx_order_sessions_share ON public.order_sessions(share_code);
CREATE INDEX IF NOT EXISTS idx_member_orders_session ON public.member_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_items_snap ON public.menu_snapshot_items(snapshot_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_snapshot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_order_items ENABLE ROW LEVEL SECURITY;

-- Allow public (anon & auth) full access to stores, categories, items
CREATE POLICY "Public stores access" ON public.stores FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public categories access" ON public.store_categories FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public items access" ON public.store_items FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Allow public full access to menu snapshots and snapshot items
CREATE POLICY "Public snapshots access" ON public.menu_snapshots FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public snapshot items access" ON public.menu_snapshot_items FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Allow public full access to order sessions, member orders, and order items
CREATE POLICY "Public sessions access" ON public.order_sessions FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public member orders access" ON public.member_orders FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Public member order items access" ON public.member_order_items FOR ALL USING (TRUE) WITH CHECK (TRUE);
