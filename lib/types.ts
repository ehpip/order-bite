export type StoreStatus = "active" | "archived";

export interface Store {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  cover_image?: string;
  address?: string;
  phone?: string;
  website?: string;
  status: StoreStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface StoreCategory {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
}

export interface StoreItem {
  id: string;
  store_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  is_available: boolean;
  sort_order: number;
  sku?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface MenuSnapshot {
  id: string;
  store_id?: string;
  store_name: string;
  store_logo?: string;
  store_address?: string;
  created_at: string;
}

export interface MenuSnapshotItem {
  id: string;
  snapshot_id: string;
  category_name: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  is_available: boolean;
  original_item_id?: string;
}

export type ShippingSplitMethod = "equal" | "proportional" | "host";
export type SessionStatus = "draft" | "open" | "closed" | "cancelled";
export type MemberPaymentStatus = "unpaid" | "payment_reported" | "paid";

export interface OrderSession {
  id: string;
  host_id?: string;
  host_identifier?: string;
  host_name?: string;
  store_id?: string;
  menu_snapshot_id: string;
  name: string;
  description?: string;
  share_code: string;
  status: SessionStatus;
  deadline: string; // ISO String
  shipping_cost: number;
  shipping_split_method: ShippingSplitMethod;
  payment_notes?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface SessionMember {
  id: string;
  session_id: string;
  name: string;
  phone?: string;
  created_at: string;
}

export interface MemberOrderItem {
  id: string;
  order_id: string;
  snapshot_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  notes?: string;
  subtotal: number;
}

export interface MemberOrder {
  id: string;
  session_id: string;
  member_id: string;
  member_name: string;
  items: MemberOrderItem[];
  food_subtotal: number;
  shipping_share: number;
  grand_total: number;
  amount_paid?: number;
  payment_status: MemberPaymentStatus;
  payment_reset_notice?: boolean;
  status: "draft" | "submitted" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface MenuImportRow {
  rowIndex: number;
  name: string;
  description: string;
  category: string;
  price: number | string;
  is_available: boolean;
  image_url?: string;
  sku?: string;
  isValid: boolean;
  errors: string[];
}
