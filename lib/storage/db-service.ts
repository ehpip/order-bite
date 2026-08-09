import {
  Store,
  StoreCategory,
  StoreItem,
  OrderSession,
  MenuSnapshot,
  MenuSnapshotItem,
  MemberOrder,
  MemberOrderItem,
  ShippingSplitMethod,
  MemberPaymentStatus,
} from '../types';
import {
  INITIAL_STORES,
  INITIAL_CATEGORIES,
  INITIAL_ITEMS,
  DEMO_SNAPSHOT,
  DEMO_SNAPSHOT_ITEMS,
  DEMO_SESSION,
  DEMO_ORDERS,
} from './seed-data';
import { generateShareCode } from '../formatters';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';

const STORAGE_KEY_STORES = 'group_food_stores_v1';
const STORAGE_KEY_CATEGORIES = 'group_food_categories_v1';
const STORAGE_KEY_ITEMS = 'group_food_items_v1';
const STORAGE_KEY_SNAPSHOTS = 'group_food_snapshots_v1';
const STORAGE_KEY_SNAPSHOT_ITEMS = 'group_food_snapshot_items_v1';
const STORAGE_KEY_SESSIONS = 'group_food_sessions_v1';
const STORAGE_KEY_ORDERS = 'group_food_orders_v1';

class LocalDatabase {
  private stores: Store[] = [];
  private categories: StoreCategory[] = [];
  private items: StoreItem[] = [];
  private snapshots: MenuSnapshot[] = [];
  private snapshotItems: MenuSnapshotItem[] = [];
  private sessions: OrderSession[] = [];
  private orders: MemberOrder[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') {
      this.stores = [...INITIAL_STORES];
      this.categories = [...INITIAL_CATEGORIES];
      this.items = [...INITIAL_ITEMS];
      this.snapshots = [DEMO_SNAPSHOT];
      this.snapshotItems = [...DEMO_SNAPSHOT_ITEMS];
      this.sessions = [DEMO_SESSION];
      this.orders = [...DEMO_ORDERS];
      return;
    }

    const savedStores = localStorage.getItem(STORAGE_KEY_STORES);
    if (!savedStores) {
      this.stores = [...INITIAL_STORES];
      this.categories = [...INITIAL_CATEGORIES];
      this.items = [...INITIAL_ITEMS];
      this.snapshots = [DEMO_SNAPSHOT];
      this.snapshotItems = [...DEMO_SNAPSHOT_ITEMS];
      this.sessions = [DEMO_SESSION];
      this.orders = [...DEMO_ORDERS];
      this.persistAll();
    } else {
      try {
        this.stores = JSON.parse(savedStores);
        this.categories = JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES) || '[]');
        this.items = JSON.parse(localStorage.getItem(STORAGE_KEY_ITEMS) || '[]');
        this.snapshots = JSON.parse(localStorage.getItem(STORAGE_KEY_SNAPSHOTS) || '[]');
        this.snapshotItems = JSON.parse(localStorage.getItem(STORAGE_KEY_SNAPSHOT_ITEMS) || '[]');
        this.sessions = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || '[]');
        this.orders = JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS) || '[]');
      } catch (e) {
        console.error('Failed to parse saved local state, resetting to seed data', e);
        this.stores = [...INITIAL_STORES];
        this.categories = [...INITIAL_CATEGORIES];
        this.items = [...INITIAL_ITEMS];
        this.snapshots = [DEMO_SNAPSHOT];
        this.snapshotItems = [...DEMO_SNAPSHOT_ITEMS];
        this.sessions = [DEMO_SESSION];
        this.orders = [...DEMO_ORDERS];
        this.persistAll();
      }
    }
  }

  private persistAll() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_STORES, JSON.stringify(this.stores));
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(this.categories));
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(this.items));
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(this.snapshots));
    localStorage.setItem(STORAGE_KEY_SNAPSHOT_ITEMS, JSON.stringify(this.snapshotItems));
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(this.sessions));
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
  }

  // --- STORES ---
  async getStores(): Promise<Store[]> {
    return [...this.stores];
  }

  async getStoreById(id: string): Promise<Store | null> {
    return this.stores.find((s) => s.id === id) || null;
  }

  async saveStore(storeData: Partial<Store> & { name: string }): Promise<Store> {
    const existingIndex = this.stores.findIndex((s) => s.id === storeData.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const updated: Store = {
        ...this.stores[existingIndex],
        ...storeData,
        updated_at: now,
      };
      this.stores[existingIndex] = updated;
      this.persistAll();
      return updated;
    } else {
      const created: Store = {
        id: `store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: storeData.name,
        description: storeData.description || '',
        logo: storeData.logo || '',
        cover_image: storeData.cover_image || '',
        address: storeData.address || '',
        phone: storeData.phone || '',
        website: storeData.website || '',
        status: storeData.status || 'active',
        created_at: now,
        updated_at: now,
      };
      this.stores.unshift(created);
      this.persistAll();
      return created;
    }
  }

  async deleteStore(id: string): Promise<void> {
    this.stores = this.stores.filter((s) => s.id !== id);
    this.persistAll();
  }

  // --- CATEGORIES ---
  async getCategories(storeId: string): Promise<StoreCategory[]> {
    return this.categories
      .filter((c) => c.store_id === storeId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async saveCategory(storeId: string, name: string): Promise<StoreCategory> {
    const existing = this.categories.find((c) => c.store_id === storeId && c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newCategory: StoreCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      store_id: storeId,
      name,
      sort_order: this.categories.filter((c) => c.store_id === storeId).length + 1,
    };
    this.categories.push(newCategory);
    this.persistAll();
    return newCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id);
    this.persistAll();
  }

  // --- ITEMS ---
  async getItems(storeId: string): Promise<StoreItem[]> {
    return this.items
      .filter((i) => i.store_id === storeId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async saveItem(itemData: Partial<StoreItem> & { store_id: string; name: string; price: number }): Promise<StoreItem> {
    const existingIdx = this.items.findIndex((i) => i.id === itemData.id);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      const updated: StoreItem = {
        ...this.items[existingIdx],
        ...itemData,
        updated_at: now,
      };
      this.items[existingIdx] = updated;
      this.persistAll();
      return updated;
    } else {
      const created: StoreItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        store_id: itemData.store_id,
        category_id: itemData.category_id,
        name: itemData.name,
        description: itemData.description || '',
        price: Number(itemData.price),
        image: itemData.image || '',
        is_available: itemData.is_available !== false,
        sort_order: itemData.sort_order || this.items.length + 1,
        sku: itemData.sku || '',
        tags: itemData.tags || [],
        created_at: now,
        updated_at: now,
      };
      this.items.push(created);
      this.persistAll();
      return created;
    }
  }

  async deleteItem(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
    this.persistAll();
  }

  async importMenuItems(
    storeId: string,
    rows: { name: string; description?: string; category?: string; price: number; is_available?: boolean; image_url?: string; sku?: string }[]
  ): Promise<{ added: number }> {
    const categoryMap = new Map<string, string>();
    const existingCats = await this.getCategories(storeId);
    existingCats.forEach((c) => categoryMap.set(c.name.toLowerCase(), c.id));

    let count = 0;
    for (const r of rows) {
      let catId: string | undefined = undefined;
      if (r.category && r.category.trim()) {
        const catName = r.category.trim();
        const catKey = catName.toLowerCase();
        if (!categoryMap.has(catKey)) {
          const newCat = await this.saveCategory(storeId, catName);
          categoryMap.set(catKey, newCat.id);
          catId = newCat.id;
        } else {
          catId = categoryMap.get(catKey);
        }
      }

      await this.saveItem({
        store_id: storeId,
        category_id: catId,
        name: r.name,
        description: r.description || '',
        price: Number(r.price) || 0,
        is_available: r.is_available !== false,
        image: r.image_url || '',
        sku: r.sku || '',
      });
      count++;
    }
    return { added: count };
  }

  // --- MENU SNAPSHOTS ---
  async createSnapshotFromStore(storeId: string): Promise<{ snapshot: MenuSnapshot; items: MenuSnapshotItem[] }> {
    const store = await this.getStoreById(storeId);
    const storeItems = await this.getItems(storeId);
    const storeCategories = await this.getCategories(storeId);

    const catNameMap = new Map<string, string>();
    storeCategories.forEach((c) => catNameMap.set(c.id, c.name));

    const snapshotId = `snap-${Date.now()}-${generateShareCode(4)}`;
    const snapshot: MenuSnapshot = {
      id: snapshotId,
      store_id: storeId,
      store_name: store ? store.name : 'Custom Store',
      store_logo: store?.logo || '',
      store_address: store?.address || '',
      created_at: new Date().toISOString(),
    };

    const items: MenuSnapshotItem[] = storeItems.map((item) => ({
      id: `snitem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      snapshot_id: snapshotId,
      category_name: (item.category_id && catNameMap.get(item.category_id)) || 'General',
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      is_available: item.is_available,
      original_item_id: item.id,
    }));

    this.snapshots.push(snapshot);
    this.snapshotItems.push(...items);
    this.persistAll();

    return { snapshot, items };
  }

  async createCustomSnapshot(
    storeName: string,
    customItems: { name: string; description?: string; price: number; category_name?: string }[]
  ): Promise<{ snapshot: MenuSnapshot; items: MenuSnapshotItem[] }> {
    const snapshotId = `snap-${Date.now()}-${generateShareCode(4)}`;
    const snapshot: MenuSnapshot = {
      id: snapshotId,
      store_name: storeName,
      created_at: new Date().toISOString(),
    };

    const items: MenuSnapshotItem[] = customItems.map((item) => ({
      id: `snitem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      snapshot_id: snapshotId,
      category_name: item.category_name || 'General',
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      is_available: true,
    }));

    this.snapshots.push(snapshot);
    this.snapshotItems.push(...items);
    this.persistAll();

    return { snapshot, items };
  }

  async getSnapshotById(snapshotId: string): Promise<MenuSnapshot | null> {
    return this.snapshots.find((s) => s.id === snapshotId) || null;
  }

  async getSnapshotItems(snapshotId: string): Promise<MenuSnapshotItem[]> {
    return this.snapshotItems.filter((i) => i.snapshot_id === snapshotId);
  }

  // --- SESSIONS ---
  async getSessions(): Promise<OrderSession[]> {
    return [...this.sessions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getSessionByShareCode(shareCode: string): Promise<OrderSession | null> {
    return this.sessions.find((s) => s.share_code === shareCode) || null;
  }

  async getSessionById(id: string): Promise<OrderSession | null> {
    return this.sessions.find((s) => s.id === id) || null;
  }

  async createSession(sessionData: {
    name: string;
    store_id?: string;
    snapshot_id: string;
    deadline: string;
    shipping_cost: number;
    shipping_split_method: ShippingSplitMethod;
    payment_notes?: string;
    host_name?: string;
  }): Promise<OrderSession> {
    let shareCode = generateShareCode(6);
    while (this.sessions.some((s) => s.share_code === shareCode)) {
      shareCode = generateShareCode(6);
    }

    const now = new Date().toISOString();
    const newSession: OrderSession = {
      id: `session-${Date.now()}-${generateShareCode(4)}`,
      host_id: 'host-user',
      host_name: sessionData.host_name || 'Group Order Host',
      store_id: sessionData.store_id,
      menu_snapshot_id: sessionData.snapshot_id,
      name: sessionData.name,
      share_code: shareCode,
      status: 'open',
      deadline: sessionData.deadline,
      shipping_cost: Number(sessionData.shipping_cost) || 0,
      shipping_split_method: sessionData.shipping_split_method,
      payment_notes: sessionData.payment_notes || '',
      created_at: now,
      updated_at: now,
    };

    this.sessions.unshift(newSession);
    this.persistAll();
    return newSession;
  }

  async updateSession(id: string, updates: Partial<OrderSession>): Promise<OrderSession | null> {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx < 0) return null;

    const updated = {
      ...this.sessions[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.sessions[idx] = updated;

    // Recalculate shipping shares if shipping_cost or method changed
    if (updates.shipping_cost !== undefined || updates.shipping_split_method !== undefined) {
      this.recalculateSessionOrderTotals(id);
    }

    this.persistAll();
    return updated;
  }

  async duplicateSession(sessionId: string, newName: string, newDeadlineISO: string): Promise<OrderSession | null> {
    const original = await this.getSessionById(sessionId);
    if (!original) return null;

    return this.createSession({
      name: newName,
      store_id: original.store_id,
      snapshot_id: original.menu_snapshot_id,
      deadline: newDeadlineISO,
      shipping_cost: original.shipping_cost,
      shipping_split_method: original.shipping_split_method,
      payment_notes: original.payment_notes,
      host_name: original.host_name,
    });
  }

  // --- ORDERS ---
  async getOrdersForSession(sessionId: string): Promise<MemberOrder[]> {
    return this.orders.filter((o) => o.session_id === sessionId);
  }

  async getOrderForMember(sessionId: string, memberId: string): Promise<MemberOrder | null> {
    return this.orders.find((o) => o.session_id === sessionId && o.member_id === memberId) || null;
  }

  async submitMemberOrder(params: {
    session_id: string;
    member_id: string;
    member_name: string;
    items: { snapshot_item_id: string; quantity: number; notes?: string }[];
  }): Promise<MemberOrder> {
    const session = await this.getSessionById(params.session_id);
    if (!session) throw new Error('Session not found');

    // Verify deadline
    const isPastDeadline = new Date(session.deadline).getTime() < Date.now();
    if (session.status !== 'open' || isPastDeadline) {
      throw new Error('Ordering is closed for this session.');
    }

    // Fetch snapshot items to calculate AUTHORITATIVE SERVER-SIDE PRICES
    const snapshotItems = await this.getSnapshotItems(session.menu_snapshot_id);
    const itemMap = new Map<string, MenuSnapshotItem>();
    snapshotItems.forEach((si) => itemMap.set(si.id, si));

    const orderItems: MemberOrderItem[] = [];
    let foodSubtotal = 0;

    const orderId = `ord-${Date.now()}-${generateShareCode(4)}`;

    for (const reqItem of params.items) {
      if (reqItem.quantity <= 0) continue;
      const snapItem = itemMap.get(reqItem.snapshot_item_id);
      if (!snapItem) continue;
      if (!snapItem.is_available) {
        throw new Error(`Item "${snapItem.name}" is currently unavailable.`);
      }

      const itemSubtotal = snapItem.price * reqItem.quantity;
      foodSubtotal += itemSubtotal;

      orderItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        order_id: orderId,
        snapshot_item_id: snapItem.id,
        item_name: snapItem.name,
        unit_price: snapItem.price,
        quantity: reqItem.quantity,
        notes: reqItem.notes || '',
        subtotal: itemSubtotal,
      });
    }

    const existingIdx = this.orders.findIndex(
      (o) => o.session_id === params.session_id && o.member_id === params.member_id
    );

    const now = new Date().toISOString();
    const newOrUpdatedOrder: MemberOrder = {
      id: existingIdx >= 0 ? this.orders[existingIdx].id : orderId,
      session_id: params.session_id,
      member_id: params.member_id,
      member_name: params.member_name,
      items: orderItems,
      food_subtotal: foodSubtotal,
      shipping_share: 0, // Calculated during recalculateSessionOrderTotals
      grand_total: foodSubtotal,
      payment_status: existingIdx >= 0 ? this.orders[existingIdx].payment_status : 'unpaid',
      status: 'submitted',
      created_at: existingIdx >= 0 ? this.orders[existingIdx].created_at : now,
      updated_at: now,
    };

    if (existingIdx >= 0) {
      this.orders[existingIdx] = newOrUpdatedOrder;
    } else {
      this.orders.push(newOrUpdatedOrder);
    }

    this.recalculateSessionOrderTotals(params.session_id);
    this.persistAll();

    // Return latest updated order with recalculated shipping
    return this.orders.find((o) => o.id === newOrUpdatedOrder.id)!;
  }

  async updateMemberPaymentStatus(orderId: string, paymentStatus: MemberPaymentStatus): Promise<MemberOrder | null> {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;

    this.orders[idx].payment_status = paymentStatus;
    this.orders[idx].updated_at = new Date().toISOString();
    this.persistAll();
    return this.orders[idx];
  }

  async deleteMemberOrder(orderId: string): Promise<void> {
    const order = this.orders.find((o) => o.id === orderId);
    this.orders = this.orders.filter((o) => o.id !== orderId);
    if (order) {
      this.recalculateSessionOrderTotals(order.session_id);
    }
    this.persistAll();
  }

  /**
   * Recalculates shipping share for all submitted member orders in a session
   */
  private recalculateSessionOrderTotals(sessionId: string) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const sessionOrders = this.orders.filter(
      (o) => o.session_id === sessionId && o.status === 'submitted'
    );
    const memberCount = sessionOrders.length;
    if (memberCount === 0) return;

    const totalFoodSubtotal = sessionOrders.reduce((sum, o) => sum + o.food_subtotal, 0);

    sessionOrders.forEach((order) => {
      let shippingShare = 0;
      if (session.shipping_split_method === 'equal') {
        shippingShare = Math.round(session.shipping_cost / memberCount);
      } else if (session.shipping_split_method === 'proportional') {
        if (totalFoodSubtotal > 0) {
          shippingShare = Math.round((order.food_subtotal / totalFoodSubtotal) * session.shipping_cost);
        } else {
          shippingShare = 0;
        }
      } else {
        shippingShare = 0; // Host pays
      }

      order.shipping_share = shippingShare;
      order.grand_total = order.food_subtotal + shippingShare;
    });
  }
}

export const db = new LocalDatabase();
