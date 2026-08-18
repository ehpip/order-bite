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
} from "../types";
import { INITIAL_STORES, INITIAL_CATEGORIES, INITIAL_ITEMS } from "./seed-data";
import { generateShareCode } from "../formatters";
import { getSupabaseClient, isSupabaseConfigured } from "../supabase/client";

const STORAGE_KEY_STORES = "group_food_stores_v1";
const STORAGE_KEY_CATEGORIES = "group_food_categories_v1";
const STORAGE_KEY_ITEMS = "group_food_items_v1";
const STORAGE_KEY_SNAPSHOTS = "group_food_snapshots_v1";
const STORAGE_KEY_SNAPSHOT_ITEMS = "group_food_snapshot_items_v1";
const STORAGE_KEY_SESSIONS = "group_food_sessions_v1";
const STORAGE_KEY_ORDERS = "group_food_orders_v1";

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

  private closeExpiredSessions() {
    const now = Date.now();
    let changed = false;
    for (let i = 0; i < this.sessions.length; i++) {
      const s = this.sessions[i];
      if (s.status === "open" && new Date(s.deadline).getTime() < now) {
        this.sessions[i] = {
          ...s,
          status: "closed",
          closed_at: s.closed_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        changed = true;
      }
    }
    if (changed) this.persistAll();
  }

  private init() {
    if (typeof window === "undefined") {
      this.stores = [...INITIAL_STORES];
      this.categories = [...INITIAL_CATEGORIES];
      this.items = [...INITIAL_ITEMS];
      this.snapshots = [];
      this.snapshotItems = [];
      this.sessions = [];
      this.orders = [];
      return;
    }

    const savedStores = localStorage.getItem(STORAGE_KEY_STORES);
    if (!savedStores) {
      this.stores = [...INITIAL_STORES];
      this.categories = [...INITIAL_CATEGORIES];
      this.items = [...INITIAL_ITEMS];
      this.snapshots = [];
      this.snapshotItems = [];
      this.sessions = [];
      this.orders = [];
      this.persistAll();
    } else {
      try {
        this.stores = JSON.parse(savedStores);
        this.categories = JSON.parse(
          localStorage.getItem(STORAGE_KEY_CATEGORIES) || "[]",
        );
        this.items = JSON.parse(
          localStorage.getItem(STORAGE_KEY_ITEMS) || "[]",
        );
        this.snapshots = JSON.parse(
          localStorage.getItem(STORAGE_KEY_SNAPSHOTS) || "[]",
        ).filter((s: MenuSnapshot) => s.id !== "snap-demo-mcd");
        this.snapshotItems = JSON.parse(
          localStorage.getItem(STORAGE_KEY_SNAPSHOT_ITEMS) || "[]",
        ).filter((i: MenuSnapshotItem) => i.snapshot_id !== "snap-demo-mcd");
        this.sessions = JSON.parse(
          localStorage.getItem(STORAGE_KEY_SESSIONS) || "[]",
        ).filter((s: OrderSession) => s.id !== "session-friday-lunch");
        this.orders = JSON.parse(
          localStorage.getItem(STORAGE_KEY_ORDERS) || "[]",
        ).filter((o: MemberOrder) => o.session_id !== "session-friday-lunch");
        this.persistAll();
      } catch (e) {
        console.error(
          "Failed to parse saved local state, resetting to seed data",
          e,
        );
        this.stores = [...INITIAL_STORES];
        this.categories = [...INITIAL_CATEGORIES];
        this.items = [...INITIAL_ITEMS];
        this.snapshots = [];
        this.snapshotItems = [];
        this.sessions = [];
        this.orders = [];
        this.persistAll();
      }
    }
  }

  private persistAll() {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_STORES, JSON.stringify(this.stores));
    localStorage.setItem(
      STORAGE_KEY_CATEGORIES,
      JSON.stringify(this.categories),
    );
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(this.items));
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(this.snapshots));
    localStorage.setItem(
      STORAGE_KEY_SNAPSHOT_ITEMS,
      JSON.stringify(this.snapshotItems),
    );
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

  async saveStore(
    storeData: Partial<Store> & { name: string },
  ): Promise<Store> {
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
        description: storeData.description || "",
        logo: storeData.logo || "",
        cover_image: storeData.cover_image || "",
        address: storeData.address || "",
        phone: storeData.phone || "",
        website: storeData.website || "",
        status: storeData.status || "active",
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
    const existing = this.categories.find(
      (c) =>
        c.store_id === storeId && c.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;

    const newCategory: StoreCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      store_id: storeId,
      name,
      sort_order:
        this.categories.filter((c) => c.store_id === storeId).length + 1,
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

  async saveItem(
    itemData: Partial<StoreItem> & {
      store_id: string;
      name: string;
      price: number;
    },
  ): Promise<StoreItem> {
    const existingIdx = this.items.findIndex((i) => i.id === itemData.id);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      const updated: StoreItem = {
        ...this.items[existingIdx],
        ...itemData,
        limit: itemData.limit,
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
        description: itemData.description || "",
        price: Number(itemData.price),
        image: itemData.image || "",
        is_available: itemData.is_available !== false,
        sort_order: itemData.sort_order || this.items.length + 1,
        sku: itemData.sku || "",
        tags: itemData.tags || [],
        limit: itemData.limit,
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
    rows: {
      name: string;
      description?: string;
      category?: string;
      price: number;
      is_available?: boolean;
      image_url?: string;
      sku?: string;
    }[],
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
        description: r.description || "",
        price: Number(r.price) || 0,
        is_available: r.is_available !== false,
        image: r.image_url || "",
        sku: r.sku || "",
      });
      count++;
    }
    return { added: count };
  }

  async importFullStore(
    storeData: {
      name: string;
      description?: string;
      logo?: string;
      cover_image?: string;
      address?: string;
    },
    rows: {
      name: string;
      description?: string;
      category?: string;
      price: number;
      is_available?: boolean;
      image_url?: string;
      sku?: string;
    }[],
  ): Promise<{ store: Store; addedItemsCount: number }> {
    const store = await this.saveStore({
      name: storeData.name,
      description: storeData.description || "",
      logo: storeData.logo || storeData.cover_image || "",
      cover_image: storeData.cover_image || storeData.logo || "",
      address: storeData.address || "",
      status: "active",
    });

    const result = await this.importMenuItems(store.id, rows);
    return { store, addedItemsCount: result.added };
  }

  // --- MENU SNAPSHOTS ---
  async createSnapshotFromStore(
    storeId: string,
  ): Promise<{ snapshot: MenuSnapshot; items: MenuSnapshotItem[] }> {
    const store = await this.getStoreById(storeId);
    const storeItems = await this.getItems(storeId);
    const storeCategories = await this.getCategories(storeId);

    const catNameMap = new Map<string, string>();
    storeCategories.forEach((c) => catNameMap.set(c.id, c.name));

    const snapshotId = `snap-${Date.now()}-${generateShareCode(4)}`;
    const snapshot: MenuSnapshot = {
      id: snapshotId,
      store_id: storeId,
      store_name: store ? store.name : "Custom Store",
      store_logo: store?.logo || "",
      store_address: store?.address || "",
      created_at: new Date().toISOString(),
    };

    const items: MenuSnapshotItem[] = storeItems.map((item) => ({
      id: `snitem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      snapshot_id: snapshotId,
      category_name:
        (item.category_id && catNameMap.get(item.category_id)) || "General",
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      is_available: item.is_available,
      limit: item.limit,
      original_item_id: item.id,
    }));

    this.snapshots.push(snapshot);
    this.snapshotItems.push(...items);
    this.persistAll();

    return { snapshot, items };
  }

  async createCustomSnapshot(
    storeName: string,
    customItems: {
      name: string;
      description?: string;
      price: number;
      category_name?: string;
      limit?: number;
    }[],
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
      category_name: item.category_name || "General",
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      is_available: true,
      limit: item.limit,
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
  async getSessions(hostId?: string): Promise<OrderSession[]> {
    this.closeExpiredSessions();
    let list = [...this.sessions];
    if (hostId) {
      list = list.filter(
        (s) => s.host_identifier === hostId || s.host_id === hostId,
      );
    }
    return list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async getSessionByShareCode(shareCode: string): Promise<OrderSession | null> {
    this.closeExpiredSessions();
    return this.sessions.find((s) => s.share_code === shareCode) || null;
  }

  async getSessionById(id: string): Promise<OrderSession | null> {
    this.closeExpiredSessions();
    return this.sessions.find((s) => s.id === id) || null;
  }

  async createSession(sessionData: {
    name: string;
    description?: string;
    store_id?: string;
    snapshot_id: string;
    deadline: string;
    shipping_cost: number;
    shipping_split_method: ShippingSplitMethod;
    payment_notes?: string;
    host_name?: string;
    host_id?: string;
    host_identifier?: string;
  }): Promise<OrderSession> {
    let shareCode = generateShareCode(6);
    while (this.sessions.some((s) => s.share_code === shareCode)) {
      shareCode = generateShareCode(6);
    }

    const now = new Date().toISOString();
    const newSession: OrderSession = {
      id: `session-${Date.now()}-${generateShareCode(4)}`,
      host_id: sessionData.host_id,
      host_identifier:
        sessionData.host_identifier || sessionData.host_id || "host-user",
      host_name: sessionData.host_name || "Group Order Host",
      store_id: sessionData.store_id,
      menu_snapshot_id: sessionData.snapshot_id,
      name: sessionData.name,
      description: sessionData.description,
      share_code: shareCode,
      status: "open",
      deadline: sessionData.deadline,
      shipping_cost: Number(sessionData.shipping_cost) || 0,
      shipping_split_method: sessionData.shipping_split_method,
      payment_notes: sessionData.payment_notes || "",
      created_at: now,
      updated_at: now,
    };

    this.sessions.unshift(newSession);
    this.persistAll();
    return newSession;
  }

  async updateSession(
    id: string,
    updates: Partial<OrderSession>,
  ): Promise<OrderSession | null> {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx < 0) return null;

    const updated = {
      ...this.sessions[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.sessions[idx] = updated;

    if (
      updates.shipping_cost !== undefined ||
      updates.shipping_split_method !== undefined
    ) {
      this.recalculateSessionOrderTotals(id);
    }

    this.persistAll();
    return updated;
  }

  async duplicateSession(
    sessionId: string,
    newName: string,
    newDeadlineISO: string,
    hostId?: string,
    hostIdentifier?: string,
  ): Promise<OrderSession | null> {
    const original = await this.getSessionById(sessionId);
    if (!original) return null;

    return this.createSession({
      name: newName,
      description: original.description,
      store_id: original.store_id,
      snapshot_id: original.menu_snapshot_id,
      deadline: newDeadlineISO,
      shipping_cost: original.shipping_cost,
      shipping_split_method: original.shipping_split_method,
      payment_notes: original.payment_notes,
      host_name: original.host_name,
      host_id: hostId || original.host_id,
      host_identifier:
        hostIdentifier ||
        original.host_identifier ||
        hostId ||
        original.host_id,
    });
  }

  private getItemQuantitiesOrdered(
    sessionId: string,
    excludeMemberId?: string,
  ): Map<string, number> {
    const totals = new Map<string, number>();
    const sessionOrders = this.orders.filter(
      (o) =>
        o.session_id === sessionId &&
        o.status === "submitted" &&
        o.member_id !== excludeMemberId,
    );
    for (const order of sessionOrders) {
      for (const item of order.items) {
        const key = item.snapshot_item_id;
        totals.set(key, (totals.get(key) || 0) + item.quantity);
      }
    }
    return totals;
  }

  async updateSnapshotItem(
    snapshotItemId: string,
    updates: Partial<MenuSnapshotItem>,
  ): Promise<MenuSnapshotItem | null> {
    const idx = this.snapshotItems.findIndex(
      (i) => String(i.id) === String(snapshotItemId),
    );
    if (idx < 0) return null;
    this.snapshotItems[idx] = {
      ...this.snapshotItems[idx],
      ...updates,
    };
    this.persistAll();
    return this.snapshotItems[idx];
  }

  // --- ORDERS ---
  async getOrdersForSession(sessionId: string): Promise<MemberOrder[]> {
    return this.orders.filter((o) => o.session_id === sessionId);
  }

  async getOrderForMember(
    sessionId: string,
    memberId: string,
  ): Promise<MemberOrder | null> {
    return (
      this.orders.find(
        (o) => o.session_id === sessionId && o.member_id === memberId,
      ) || null
    );
  }

  async submitMemberOrder(params: {
    session_id: string;
    member_id: string;
    member_name: string;
    items: { snapshot_item_id: string; quantity: number; notes?: string }[];
  }): Promise<MemberOrder> {
    const session = await this.getSessionById(params.session_id);
    if (!session) throw new Error("Session not found");

    // Verify deadline
    const isPastDeadline = new Date(session.deadline).getTime() < Date.now();
    if (session.status !== "open" || isPastDeadline) {
      throw new Error("Ordering is closed for this session.");
    }

    // Fetch snapshot items to calculate AUTHORITATIVE SERVER-SIDE PRICES
    const snapshotItems = await this.getSnapshotItems(session.menu_snapshot_id);
    const itemMap = new Map<string, MenuSnapshotItem>();
    snapshotItems.forEach((si) => itemMap.set(si.id, si));

    const existingQuantities = this.getItemQuantitiesOrdered(
      params.session_id,
      params.member_id,
    );

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

      if (snapItem.limit !== undefined && snapItem.limit !== null) {
        const alreadyOrdered = existingQuantities.get(snapItem.id) || 0;
        const totalIfSubmitted = alreadyOrdered + reqItem.quantity;
        if (totalIfSubmitted > snapItem.limit) {
          const remaining = Math.max(0, snapItem.limit - alreadyOrdered);
          if (remaining === 0) {
            throw new Error(
              `Sorry, "${snapItem.name}" is fully booked. All ${snapItem.limit} units have been reserved by others.`,
            );
          } else {
            throw new Error(
              `Sorry, only ${remaining} of "${snapItem.name}" are left. You tried to order ${reqItem.quantity}.`,
            );
          }
        }
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
        notes: reqItem.notes || "",
        subtotal: itemSubtotal,
      });
    }

    const existingIdx = this.orders.findIndex(
      (o) =>
        o.session_id === params.session_id && o.member_id === params.member_id,
    );
    const previousOrder = existingIdx >= 0 ? this.orders[existingIdx] : null;

    let paymentStatus: MemberPaymentStatus = "unpaid";
    let paymentResetNotice = false;

    if (previousOrder) {
      const itemsChanged = haveOrderItemsChanged(
        previousOrder.items,
        params.items,
      );
      if (itemsChanged && previousOrder.payment_status !== "unpaid") {
        // Amount changed after payment was reported/confirmed — must re-verify.
        paymentStatus = "unpaid";
        paymentResetNotice = true;
      } else {
        paymentStatus = previousOrder.payment_status;
      }
    }

    const now = new Date().toISOString();
    const newOrUpdatedOrder: MemberOrder = {
      id: existingIdx >= 0 ? this.orders[existingIdx].id : orderId,
      session_id: params.session_id,
      member_id: params.member_id,
      member_name: params.member_name,
      items: orderItems,
      food_subtotal: foodSubtotal,
      shipping_share: 0,
      grand_total: foodSubtotal,
      amount_paid:
        paymentStatus === "unpaid" ? undefined : previousOrder?.amount_paid,
      payment_status: paymentStatus,
      payment_reset_notice: paymentResetNotice,
      status: "submitted",
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

  async updateMemberPaymentStatus(
    orderId: string,
    paymentStatus: MemberPaymentStatus,
  ): Promise<MemberOrder | null> {
    const idx = this.orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;

    const wasLocked = this.orders[idx].payment_status !== "unpaid";
    const isNowLocked = paymentStatus !== "unpaid";

    if (isNowLocked && !wasLocked) {
      this.orders[idx].amount_paid = this.orders[idx].grand_total;
    } else if (!isNowLocked && wasLocked) {
      this.orders[idx].amount_paid = undefined;
    }

    this.orders[idx].payment_status = paymentStatus;
    this.orders[idx].payment_reset_notice = false;
    this.orders[idx].updated_at = new Date().toISOString();

    this.recalculateSessionOrderTotals(this.orders[idx].session_id);
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
  /**
   * Recalculates shipping share for all submitted member orders in a session.
   * Orders whose payment_status is no longer "unpaid" (reported or confirmed
   * paid) are LOCKED: their shipping_share/grand_total stay frozen at
   * whatever they were when locked, and they're excluded from redistribution.
   * Only still-unpaid orders absorb the remaining shipping cost as headcount
   * changes.
   */
  private recalculateSessionOrderTotals(sessionId: string) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const sessionOrders = this.orders.filter(
      (o) => o.session_id === sessionId && o.status === "submitted",
    );
    if (sessionOrders.length === 0) return;

    const lockedOrders = sessionOrders.filter(
      (o) => o.payment_status !== "unpaid",
    );
    const unlockedOrders = sessionOrders.filter(
      (o) => o.payment_status === "unpaid",
    );

    if (unlockedOrders.length === 0) return; // everyone already paid/reported

    const lockedShippingSum = lockedOrders.reduce(
      (sum, o) => sum + o.shipping_share,
      0,
    );
    const remainingShipping = Math.max(
      0,
      session.shipping_cost - lockedShippingSum,
    );

    const totalFoodSubtotalUnlocked = unlockedOrders.reduce(
      (sum, o) => sum + o.food_subtotal,
      0,
    );

    unlockedOrders.forEach((order) => {
      let shippingShare = 0;
      if (session.shipping_split_method === "equal") {
        shippingShare = Math.round(remainingShipping / unlockedOrders.length);
      } else if (session.shipping_split_method === "proportional") {
        shippingShare =
          totalFoodSubtotalUnlocked > 0
            ? Math.round(
                (order.food_subtotal / totalFoodSubtotalUnlocked) *
                  remainingShipping,
              )
            : 0;
      } else {
        shippingShare = 0; // Host pays
      }

      order.shipping_share = shippingShare;
      order.grand_total = order.food_subtotal + shippingShare;
    });
  }
}

function toValidUuidOrNull(str?: string | null): string | null {
  if (!str) return null;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

function haveOrderItemsChanged(
  oldItems: MemberOrderItem[],
  newItems: { snapshot_item_id: string; quantity: number; notes?: string }[],
): boolean {
  if (oldItems.length !== newItems.length) return true;

  const normalize = (
    arr: { snapshot_item_id: string; quantity: number; notes?: string }[],
  ) =>
    [...arr]
      .map(
        (i) => `${i.snapshot_item_id}:${i.quantity}:${(i.notes || "").trim()}`,
      )
      .sort()
      .join("|");

  const oldNormalized = normalize(
    oldItems.map((i) => ({
      snapshot_item_id: i.snapshot_item_id,
      quantity: i.quantity,
      notes: i.notes,
    })),
  );
  const newNormalized = normalize(newItems);

  return oldNormalized !== newNormalized;
}

const localDb = new LocalDatabase();

class SupabaseDatabase {
  private get client() {
    return getSupabaseClient();
  }

  private async closeExpiredSessions(hostId?: string) {
    const client = this.client;
    if (!client) return;
    try {
      const now = new Date().toISOString();
      let query = client
        .from("order_sessions")
        .update({ status: "closed", closed_at: now, updated_at: now })
        .eq("status", "open")
        .lt("deadline", now);
      if (hostId) {
        query = query.or(`host_identifier.eq.${hostId},host_id.eq.${hostId}`);
      }
      await query;
    } catch (e) {
      console.warn("Supabase closeExpiredSessions failed:", e);
    }
  }

  // --- STORES ---
  async getStores(): Promise<Store[]> {
    const client = this.client;
    if (!client) return localDb.getStores();
    const { data, error } = await client
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) {
      console.warn("Supabase getStores fallback to local:", error);
      return localDb.getStores();
    }
    if (data.length === 0) {
      try {
        const localStores = await localDb.getStores();
        for (const ls of localStores) {
          await this.saveStore(ls);
        }
        const { data: seeded } = await client
          .from("stores")
          .select("*")
          .order("created_at", { ascending: false });
        if (seeded && seeded.length > 0) {
          return seeded as Store[];
        }
      } catch (err) {
        console.warn(
          "Auto-seeding stores into Supabase failed (likely RLS policy). Returning local defaults.",
        );
      }
      return localDb.getStores();
    }
    return data as Store[];
  }

  async getStoreById(id: string): Promise<Store | null> {
    const client = this.client;
    if (!client) return localDb.getStoreById(id);
    const validUuid = toValidUuidOrNull(id);
    if (!validUuid) {
      return localDb.getStoreById(id);
    }
    const { data, error } = await client
      .from("stores")
      .select("*")
      .eq("id", validUuid)
      .maybeSingle();
    if (error || !data) return localDb.getStoreById(id);
    return data as Store;
  }

  async saveStore(
    storeData: Partial<Store> & { name: string },
  ): Promise<Store> {
    const client = this.client;
    if (!client) return localDb.saveStore(storeData);
    const validUuid = toValidUuidOrNull(storeData.id);
    if (validUuid) {
      const { data, error } = await client
        .from("stores")
        .update({
          name: storeData.name,
          description: storeData.description || "",
          logo: storeData.logo || "",
          cover_image: storeData.cover_image || "",
          address: storeData.address || "",
          phone: storeData.phone || "",
          website: storeData.website || "",
          status: storeData.status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", validUuid)
        .select()
        .single();
      if (error || !data) {
        console.error("Supabase update store error:", error);
        return localDb.saveStore(storeData);
      }
      return data as Store;
    } else {
      const { data, error } = await client
        .from("stores")
        .insert({
          name: storeData.name,
          description: storeData.description || "",
          logo: storeData.logo || "",
          cover_image: storeData.cover_image || "",
          address: storeData.address || "",
          phone: storeData.phone || "",
          website: storeData.website || "",
          status: storeData.status || "active",
        })
        .select()
        .single();
      if (error || !data) {
        if (error?.code === "42501") {
          console.warn(
            "Supabase RLS Error (42501): Public write access is disabled by Row Level Security in your Supabase project. Please run the RLS SQL script in Supabase SQL Editor.",
          );
        } else {
          console.error("Supabase insert store error:", error);
        }
        return localDb.saveStore(storeData);
      }
      return data as Store;
    }
  }

  async deleteStore(id: string): Promise<void> {
    const client = this.client;
    if (!client) return localDb.deleteStore(id);
    const validUuid = toValidUuidOrNull(id);
    if (validUuid) {
      await client.from("stores").delete().eq("id", validUuid);
    }
    await localDb.deleteStore(id);
  }

  // --- CATEGORIES ---
  async getCategories(storeId: string): Promise<StoreCategory[]> {
    const client = this.client;
    if (!client) return localDb.getCategories(storeId);
    const validUuid = toValidUuidOrNull(storeId);
    if (!validUuid) return localDb.getCategories(storeId);
    const { data, error } = await client
      .from("store_categories")
      .select("*")
      .eq("store_id", validUuid)
      .order("sort_order", { ascending: true });
    if (error || !data) return localDb.getCategories(storeId);
    return data as StoreCategory[];
  }

  async saveCategory(storeId: string, name: string): Promise<StoreCategory> {
    const client = this.client;
    if (!client) return localDb.saveCategory(storeId, name);
    const validUuid = toValidUuidOrNull(storeId);
    if (!validUuid) return localDb.saveCategory(storeId, name);

    const { data: existing, error: listErr } = await client
      .from("store_categories")
      .select("*")
      .eq("store_id", validUuid);

    if (!listErr && existing) {
      const match = existing.find(
        (c: StoreCategory) => c.name.toLowerCase() === name.toLowerCase(),
      );
      if (match) return match as StoreCategory;
    }

    const sortOrder =
      existing && existing.length > 0
        ? Math.max(...existing.map((c: StoreCategory) => c.sort_order || 0)) + 1
        : 1;

    const { data, error } = await client
      .from("store_categories")
      .insert({
        store_id: validUuid,
        name,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (error || !data) {
      console.error("Supabase saveCategory error:", error);
      return localDb.saveCategory(storeId, name);
    }
    return data as StoreCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    const client = this.client;
    if (!client) return localDb.deleteCategory(id);
    const validUuid = toValidUuidOrNull(id);
    if (validUuid) {
      await client.from("store_categories").delete().eq("id", validUuid);
    }
    await localDb.deleteCategory(id);
  }

  // --- ITEMS ---
  async getItems(storeId: string): Promise<StoreItem[]> {
    const client = this.client;
    if (!client) return localDb.getItems(storeId);
    const validUuid = toValidUuidOrNull(storeId);
    if (!validUuid) return localDb.getItems(storeId);
    const { data, error } = await client
      .from("store_items")
      .select("*")
      .eq("store_id", validUuid)
      .order("sort_order", { ascending: true });
    if (error || !data) return localDb.getItems(storeId);
    return data as StoreItem[];
  }

  async saveItem(
    itemData: Partial<StoreItem> & {
      store_id: string;
      name: string;
      price: number;
    },
  ): Promise<StoreItem> {
    const client = this.client;
    if (!client) return localDb.saveItem(itemData);
    const validStoreUuid = toValidUuidOrNull(itemData.store_id);
    const validCatUuid = toValidUuidOrNull(itemData.category_id);
    const validItemUuid = toValidUuidOrNull(itemData.id);

    if (validItemUuid) {
      const { data, error } = await client
        .from("store_items")
        .update({
          name: itemData.name,
          category_id: validCatUuid,
          description: itemData.description || "",
          price: itemData.price,
          image: itemData.image || "",
          is_available: itemData.is_available !== false,
          sku: itemData.sku || "",
          limit: itemData.limit ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validItemUuid)
        .select()
        .single();
      if (error || !data) {
        console.error("Supabase update item error:", error);
        return localDb.saveItem(itemData);
      }
      return data as StoreItem;
    } else {
      if (!validStoreUuid) return localDb.saveItem(itemData);
      const { data, error } = await client
        .from("store_items")
        .insert({
          store_id: validStoreUuid,
          category_id: validCatUuid,
          name: itemData.name,
          description: itemData.description || "",
          price: itemData.price,
          image: itemData.image || "",
          is_available: itemData.is_available !== false,
          sku: itemData.sku || "",
          limit: itemData.limit ?? null,
        })
        .select()
        .single();
      if (error || !data) {
        console.error("Supabase insert item error:", error);
        return localDb.saveItem(itemData);
      }
      return data as StoreItem;
    }
  }

  async deleteItem(id: string): Promise<void> {
    const client = this.client;
    if (!client) return localDb.deleteItem(id);
    const validUuid = toValidUuidOrNull(id);
    if (validUuid) {
      await client.from("store_items").delete().eq("id", validUuid);
    }
    await localDb.deleteItem(id);
  }

  async importMenuItems(
    storeId: string,
    rows: {
      name: string;
      description?: string;
      category?: string;
      price: number;
      is_available?: boolean;
      image_url?: string;
      sku?: string;
    }[],
  ): Promise<{ added: number }> {
    const client = this.client;
    if (!client) return localDb.importMenuItems(storeId, rows);

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
        description: r.description || "",
        price: Number(r.price) || 0,
        is_available: r.is_available !== false,
        image: r.image_url || "",
        sku: r.sku || "",
      });
      count++;
    }
    return { added: count };
  }

  async importFullStore(
    storeData: {
      name: string;
      description?: string;
      logo?: string;
      cover_image?: string;
      address?: string;
    },
    rows: {
      name: string;
      description?: string;
      category?: string;
      price: number;
      is_available?: boolean;
      image_url?: string;
      sku?: string;
    }[],
  ): Promise<{ store: Store; addedItemsCount: number }> {
    const client = this.client;
    if (!client) return localDb.importFullStore(storeData, rows);

    const store = await this.saveStore({
      name: storeData.name,
      description: storeData.description || "",
      logo: storeData.logo || storeData.cover_image || "",
      cover_image: storeData.cover_image || storeData.logo || "",
      address: storeData.address || "",
      status: "active",
    });

    const result = await this.importMenuItems(store.id, rows);
    return { store, addedItemsCount: result.added };
  }

  // --- MENU SNAPSHOTS ---
  async createSnapshotFromStore(
    storeId: string,
  ): Promise<{ snapshot: MenuSnapshot; items: MenuSnapshotItem[] }> {
    const client = this.client;
    if (!client) return localDb.createSnapshotFromStore(storeId);
    const store = await this.getStoreById(storeId);
    const storeItems = await this.getItems(storeId);
    const storeCategories = await this.getCategories(storeId);
    const catNameMap = new Map<string, string>();
    storeCategories.forEach((c) => catNameMap.set(c.id, c.name));

    const { data: snapData, error: snapErr } = await client
      .from("menu_snapshots")
      .insert({
        store_id: toValidUuidOrNull(storeId),
        store_name: store ? store.name : "Custom Store",
        store_logo: store?.logo || "",
        store_address: store?.address || "",
      })
      .select()
      .single();

    if (snapErr || !snapData) {
      console.error("Supabase createSnapshotFromStore error:", snapErr);
      return localDb.createSnapshotFromStore(storeId);
    }

    const snapshot = snapData as MenuSnapshot;
    const itemsToInsert = storeItems.map((item) => ({
      snapshot_id: snapshot.id,
      category_name:
        (item.category_id && catNameMap.get(item.category_id)) || "General",
      name: item.name,
      description: item.description || "",
      price: item.price,
      image: item.image || "",
      is_available: item.is_available,
      limit: item.limit ?? null,
      original_item_id: toValidUuidOrNull(item.id),
    }));

    const { data: itemsData, error: itemsErr } = await client
      .from("menu_snapshot_items")
      .insert(itemsToInsert)
      .select();
    if (itemsErr || !itemsData) {
      console.error("Supabase insert snapshot items error:", itemsErr);
      return localDb.createSnapshotFromStore(storeId);
    }

    return { snapshot, items: itemsData as MenuSnapshotItem[] };
  }

  async createCustomSnapshot(
    storeName: string,
    customItems: {
      name: string;
      description?: string;
      price: number;
      category_name?: string;
      limit?: number;
    }[],
  ): Promise<{ snapshot: MenuSnapshot; items: MenuSnapshotItem[] }> {
    const client = this.client;
    if (!client) return localDb.createCustomSnapshot(storeName, customItems);
    const { data: snapData, error: snapErr } = await client
      .from("menu_snapshots")
      .insert({
        store_name: storeName,
      })
      .select()
      .single();

    if (snapErr || !snapData) {
      console.error("Supabase createCustomSnapshot error:", snapErr);
      return localDb.createCustomSnapshot(storeName, customItems);
    }

    const snapshot = snapData as MenuSnapshot;
    const itemsToInsert = customItems.map((item) => ({
      snapshot_id: snapshot.id,
      category_name: item.category_name || "General",
      name: item.name,
      description: item.description || "",
      price: Number(item.price),
      is_available: true,
      limit: item.limit ?? null,
    }));

    const { data: itemsData, error: itemsErr } = await client
      .from("menu_snapshot_items")
      .insert(itemsToInsert)
      .select();
    if (itemsErr || !itemsData) {
      console.error("Supabase insert custom snapshot items error:", itemsErr);
      return localDb.createCustomSnapshot(storeName, customItems);
    }

    return { snapshot, items: itemsData as MenuSnapshotItem[] };
  }

  async getSnapshotById(snapshotId: string): Promise<MenuSnapshot | null> {
    const client = this.client;
    if (!client) return localDb.getSnapshotById(snapshotId);
    const validUuid = toValidUuidOrNull(snapshotId);
    if (!validUuid) return localDb.getSnapshotById(snapshotId);
    const { data, error } = await client
      .from("menu_snapshots")
      .select("*")
      .eq("id", validUuid)
      .maybeSingle();
    if (error || !data) return localDb.getSnapshotById(snapshotId);
    return data as MenuSnapshot;
  }

  async getSnapshotItems(snapshotId: string): Promise<MenuSnapshotItem[]> {
    const client = this.client;
    if (!client) return localDb.getSnapshotItems(snapshotId);
    const validUuid = toValidUuidOrNull(snapshotId);
    if (!validUuid) return localDb.getSnapshotItems(snapshotId);
    const { data, error } = await client
      .from("menu_snapshot_items")
      .select("*")
      .eq("snapshot_id", validUuid);
    if (error || !data) return localDb.getSnapshotItems(snapshotId);
    return data as MenuSnapshotItem[];
  }

  // --- SESSIONS ---
  async getSessions(hostId?: string): Promise<OrderSession[]> {
    await this.closeExpiredSessions(hostId);
    const localSessions = await localDb.getSessions(hostId);
    const client = this.client;
    if (!client) return localSessions;
    let query = client.from("order_sessions").select("*");
    if (hostId) {
      query = query.or(`host_identifier.eq.${hostId},host_id.eq.${hostId}`);
    }
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error || !data) {
      console.warn("Supabase getSessions fallback to local:", error);
      return localSessions;
    }
    return (data as OrderSession[]).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async getSessionByShareCode(shareCode: string): Promise<OrderSession | null> {
    await this.closeExpiredSessions();
    const client = this.client;
    if (!client) return localDb.getSessionByShareCode(shareCode);
    const { data, error } = await client
      .from("order_sessions")
      .select("*")
      .eq("share_code", shareCode)
      .maybeSingle();
    if (error || !data) {
      console.warn("Supabase getSessionByShareCode fallback:", error);
      return localDb.getSessionByShareCode(shareCode);
    }
    return data as OrderSession;
  }

  async getSessionById(id: string): Promise<OrderSession | null> {
    await this.closeExpiredSessions();
    const client = this.client;
    if (!client) return localDb.getSessionById(id);
    const validUuid = toValidUuidOrNull(id);
    if (!validUuid) return localDb.getSessionById(id);
    const { data, error } = await client
      .from("order_sessions")
      .select("*")
      .eq("id", validUuid)
      .maybeSingle();
    if (error || !data) return localDb.getSessionById(id);
    return data as OrderSession;
  }

  async createSession(sessionData: {
    name: string;
    description?: string;
    store_id?: string;
    snapshot_id: string;
    deadline: string;
    shipping_cost: number;
    shipping_split_method: ShippingSplitMethod;
    payment_notes?: string;
    host_name?: string;
    host_id?: string;
    host_identifier?: string;
  }): Promise<OrderSession> {
    const localSession = await localDb.createSession(sessionData);

    const client = this.client;
    if (!client) return localSession;

    const validMenuSnapshotUuid = toValidUuidOrNull(sessionData.snapshot_id);
    if (!validMenuSnapshotUuid) {
      console.warn(
        "Supabase createSession: menu_snapshot_id is not a valid UUID, returning local only",
      );
      return localSession;
    }

    const { data, error } = await client
      .from("order_sessions")
      .insert({
        host_id: toValidUuidOrNull(sessionData.host_id),
        host_identifier:
          sessionData.host_identifier || sessionData.host_id || null,
        host_name: sessionData.host_name || "Group Order Host",
        store_id: toValidUuidOrNull(sessionData.store_id),
        menu_snapshot_id: validMenuSnapshotUuid,
        name: sessionData.name,
        description: sessionData.description || null,
        share_code: localSession.share_code,
        status: "open",
        deadline: sessionData.deadline,
        shipping_cost: Number(sessionData.shipping_cost) || 0,
        shipping_split_method: sessionData.shipping_split_method,
        payment_notes: sessionData.payment_notes || "",
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Supabase createSession error:", error);
      return localSession;
    }
    return data as OrderSession;
  }

  async updateSession(
    id: string,
    updates: Partial<OrderSession>,
  ): Promise<OrderSession | null> {
    const client = this.client;
    if (!client) return localDb.updateSession(id, updates);
    const validUuid = toValidUuidOrNull(id);
    if (!validUuid) return localDb.updateSession(id, updates);

    const safeUpdates: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if ("host_id" in safeUpdates)
      safeUpdates.host_id = toValidUuidOrNull(safeUpdates.host_id);
    if ("host_identifier" in safeUpdates)
      safeUpdates.host_identifier = safeUpdates.host_identifier ?? null;
    if ("store_id" in safeUpdates)
      safeUpdates.store_id = toValidUuidOrNull(safeUpdates.store_id);
    if ("menu_snapshot_id" in safeUpdates)
      safeUpdates.menu_snapshot_id = toValidUuidOrNull(
        safeUpdates.menu_snapshot_id,
      );

    const { data, error } = await client
      .from("order_sessions")
      .update(safeUpdates)
      .eq("id", validUuid)
      .select()
      .single();

    if (error || !data) return localDb.updateSession(id, updates);

    if (
      updates.shipping_cost !== undefined ||
      updates.shipping_split_method !== undefined
    ) {
      await this.recalculateSessionOrderTotals(id);
    }

    return data as OrderSession;
  }

  async duplicateSession(
    sessionId: string,
    newName: string,
    newDeadlineISO: string,
    hostId?: string,
    hostIdentifier?: string,
  ): Promise<OrderSession | null> {
    const original = await this.getSessionById(sessionId);
    if (!original) return null;
    return this.createSession({
      name: newName,
      description: original.description,
      store_id: original.store_id,
      snapshot_id: original.menu_snapshot_id,
      deadline: newDeadlineISO,
      shipping_cost: original.shipping_cost,
      shipping_split_method: original.shipping_split_method,
      payment_notes: original.payment_notes,
      host_name: original.host_name,
      host_id: hostId || original.host_id,
      host_identifier:
        hostIdentifier ||
        original.host_identifier ||
        hostId ||
        original.host_id,
    });
  }

  private async getItemQuantitiesOrdered(
    sessionId: string,
    excludeMemberId?: string,
  ): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    const allOrders = await this.getOrdersForSession(sessionId);
    for (const order of allOrders) {
      if (excludeMemberId && order.member_id === excludeMemberId) continue;
      if (order.status !== "submitted") continue;
      for (const item of order.items) {
        const key = item.snapshot_item_id;
        totals.set(key, (totals.get(key) || 0) + item.quantity);
      }
    }
    return totals;
  }

  async updateSnapshotItem(
    snapshotItemId: string,
    updates: Partial<MenuSnapshotItem>,
  ): Promise<MenuSnapshotItem | null> {
    const client = this.client;
    if (!client) return localDb.updateSnapshotItem(snapshotItemId, updates);
    const validUuid = toValidUuidOrNull(snapshotItemId);
    if (!validUuid) return localDb.updateSnapshotItem(snapshotItemId, updates);

    const safeUpdates: any = {};
    if ("name" in updates) safeUpdates.name = updates.name;
    if ("description" in updates)
      safeUpdates.description = updates.description ?? null;
    if ("price" in updates) safeUpdates.price = updates.price;
    if ("is_available" in updates)
      safeUpdates.is_available = updates.is_available;
    if ("limit" in updates) safeUpdates.limit = updates.limit ?? null;
    if ("category_name" in updates)
      safeUpdates.category_name = updates.category_name;

    const { data, error } = await client
      .from("menu_snapshot_items")
      .update(safeUpdates)
      .eq("id", validUuid)
      .select()
      .single();
    if (error || !data)
      return localDb.updateSnapshotItem(snapshotItemId, updates);
    return data as MenuSnapshotItem;
  }

  // --- ORDERS ---
  async getOrdersForSession(sessionId: string): Promise<MemberOrder[]> {
    const client = this.client;
    if (!client) return localDb.getOrdersForSession(sessionId);
    const { data: ordersData, error: ordersErr } = await client
      .from("member_orders")
      .select("*")
      .eq("session_id", sessionId);
    if (ordersErr || !ordersData) return localDb.getOrdersForSession(sessionId);

    const result: MemberOrder[] = [];
    for (const ord of ordersData) {
      const { data: itemsData } = await client
        .from("member_order_items")
        .select("*")
        .eq("order_id", ord.id);
      result.push({
        ...ord,
        items: (itemsData || []) as MemberOrderItem[],
      });
    }

    return result;
  }

  async getOrderForMember(
    sessionId: string,
    memberId: string,
  ): Promise<MemberOrder | null> {
    const client = this.client;
    if (!client) return localDb.getOrderForMember(sessionId, memberId);
    const { data: ord, error } = await client
      .from("member_orders")
      .select("*")
      .eq("session_id", sessionId)
      .eq("member_id", memberId)
      .maybeSingle();
    if (error || !ord) return localDb.getOrderForMember(sessionId, memberId);

    const { data: itemsData } = await client
      .from("member_order_items")
      .select("*")
      .eq("order_id", ord.id);
    return {
      ...ord,
      items: (itemsData || []) as MemberOrderItem[],
    };
  }

  async submitMemberOrder(params: {
    session_id: string;
    member_id: string;
    member_name: string;
    items: { snapshot_item_id: string; quantity: number; notes?: string }[];
  }): Promise<MemberOrder> {
    const client = this.client;
    if (!client) return localDb.submitMemberOrder(params);

    const session = await this.getSessionById(params.session_id);
    if (!session) throw new Error("Session not found");

    const isPastDeadline = new Date(session.deadline).getTime() < Date.now();
    if (session.status !== "open" || isPastDeadline) {
      throw new Error("Ordering is closed for this session.");
    }

    const snapshotItems = await this.getSnapshotItems(session.menu_snapshot_id);
    const itemMap = new Map<string, MenuSnapshotItem>();
    snapshotItems.forEach((si) => itemMap.set(si.id, si));

    const existingQuantities = await this.getItemQuantitiesOrdered(
      params.session_id,
      params.member_id,
    );

    let foodSubtotal = 0;
    const itemsToInsert: {
      snapshot_item_id: string;
      item_name: string;
      unit_price: number;
      quantity: number;
      notes: string;
      subtotal: number;
    }[] = [];

    for (const reqItem of params.items) {
      if (reqItem.quantity <= 0) continue;
      const snapItem = itemMap.get(reqItem.snapshot_item_id);
      if (!snapItem) continue;
      if (!snapItem.is_available)
        throw new Error(`Item "${snapItem.name}" is currently unavailable.`);

      if (snapItem.limit !== undefined && snapItem.limit !== null) {
        const alreadyOrdered = existingQuantities.get(snapItem.id) || 0;
        const totalIfSubmitted = alreadyOrdered + reqItem.quantity;
        if (totalIfSubmitted > snapItem.limit) {
          const remaining = Math.max(0, snapItem.limit - alreadyOrdered);
          if (remaining === 0) {
            throw new Error(
              `Sorry, "${snapItem.name}" is fully booked. All ${snapItem.limit} units have been reserved by others.`,
            );
          } else {
            throw new Error(
              `Sorry, only ${remaining} of "${snapItem.name}" are left. You tried to order ${reqItem.quantity}.`,
            );
          }
        }
      }

      const itemSubtotal = snapItem.price * reqItem.quantity;
      foodSubtotal += itemSubtotal;

      const validSnapItemUuid = toValidUuidOrNull(snapItem.id);
      if (!validSnapItemUuid) {
        console.warn(
          `Supabase submitMemberOrder: snapshot_item_id ${snapItem.id} not a UUID, falling back to local`,
        );
        return localDb.submitMemberOrder(params);
      }

      itemsToInsert.push({
        snapshot_item_id: validSnapItemUuid,
        item_name: snapItem.name,
        unit_price: snapItem.price,
        quantity: reqItem.quantity,
        notes: reqItem.notes || "",
        subtotal: itemSubtotal,
      });
    }

    const existingOrder = await this.getOrderForMember(
      params.session_id,
      params.member_id,
    );
    let paymentStatus: MemberPaymentStatus = "unpaid";
    let paymentResetNotice = false;
    if (existingOrder) {
      const itemsChanged = haveOrderItemsChanged(
        existingOrder.items,
        params.items,
      );
      if (itemsChanged && existingOrder.payment_status !== "unpaid") {
        paymentStatus = "unpaid";
        paymentResetNotice = true;
      } else {
        paymentStatus = existingOrder.payment_status;
      }
    }
    let orderId: string;

    const validSessionUuid = toValidUuidOrNull(params.session_id);
    if (!validSessionUuid) {
      console.warn(
        "Supabase submitMemberOrder: session_id not a valid UUID, falling back to local",
      );
      return localDb.submitMemberOrder(params);
    }

    if (existingOrder) {
      const validOrderUuid = toValidUuidOrNull(existingOrder.id);
      if (!validOrderUuid) return localDb.submitMemberOrder(params);
      orderId = validOrderUuid;
      await client
        .from("member_orders")
        .update({
          member_name: params.member_name,
          food_subtotal: foodSubtotal,
          grand_total: foodSubtotal,
          amount_paid:
            paymentStatus === "unpaid"
              ? null
              : (existingOrder.amount_paid ?? null),
          payment_status: paymentStatus,
          payment_reset_notice: paymentResetNotice,
          status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", validOrderUuid);

      await client
        .from("member_order_items")
        .delete()
        .eq("order_id", validOrderUuid);
    } else {
      const { data: newOrd, error: ordErr } = await client
        .from("member_orders")
        .insert({
          session_id: validSessionUuid,
          member_id: params.member_id,
          member_name: params.member_name,
          food_subtotal: foodSubtotal,
          shipping_share: 0,
          grand_total: foodSubtotal,
          amount_paid: null,
          payment_status: "unpaid",
          payment_reset_notice: false,
          status: "submitted",
        })
        .select()
        .single();

      if (ordErr || !newOrd) return localDb.submitMemberOrder(params);
      orderId = newOrd.id;
    }

    if (itemsToInsert.length > 0) {
      await client
        .from("member_order_items")
        .insert(itemsToInsert.map((item) => ({ ...item, order_id: orderId })));
    }

    await this.recalculateSessionOrderTotals(params.session_id);
    const finalOrder = await this.getOrderForMember(
      params.session_id,
      params.member_id,
    );
    return finalOrder || localDb.submitMemberOrder(params);
  }

  async updateMemberPaymentStatus(
    orderId: string,
    paymentStatus: MemberPaymentStatus,
  ): Promise<MemberOrder | null> {
    const client = this.client;
    if (!client)
      return localDb.updateMemberPaymentStatus(orderId, paymentStatus);
    const validOrderUuid = toValidUuidOrNull(orderId);
    if (!validOrderUuid)
      return localDb.updateMemberPaymentStatus(orderId, paymentStatus);

    const { data: existing, error: fetchErr } = await client
      .from("member_orders")
      .select("*")
      .eq("id", validOrderUuid)
      .maybeSingle();
    if (fetchErr || !existing)
      return localDb.updateMemberPaymentStatus(orderId, paymentStatus);

    const wasLocked = existing.payment_status !== "unpaid";
    const isNowLocked = paymentStatus !== "unpaid";
    let amountPaidValue: number | null = existing.amount_paid ?? null;

    if (isNowLocked && !wasLocked) {
      amountPaidValue = Number(existing.grand_total);
    } else if (!isNowLocked && wasLocked) {
      amountPaidValue = null;
    }

    const { data, error } = await client
      .from("member_orders")
      .update({
        payment_status: paymentStatus,
        payment_reset_notice: false,
        amount_paid: amountPaidValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", validOrderUuid)
      .select()
      .single();

    if (error || !data)
      return localDb.updateMemberPaymentStatus(orderId, paymentStatus);

    await this.recalculateSessionOrderTotals(data.session_id);

    const { data: itemsData } = await client
      .from("member_order_items")
      .select("*")
      .eq("order_id", validOrderUuid);
    return { ...data, items: (itemsData || []) as MemberOrderItem[] };
  }

  async deleteMemberOrder(orderId: string): Promise<void> {
    const client = this.client;
    if (!client) return localDb.deleteMemberOrder(orderId);
    const validOrderUuid = toValidUuidOrNull(orderId);
    if (validOrderUuid) {
      const { data: ord } = await client
        .from("member_orders")
        .select("session_id")
        .eq("id", validOrderUuid)
        .maybeSingle();
      await client.from("member_orders").delete().eq("id", validOrderUuid);
      if (ord?.session_id) {
        await this.recalculateSessionOrderTotals(ord.session_id);
      }
    }
    await localDb.deleteMemberOrder(orderId);
  }

  private async recalculateSessionOrderTotals(sessionId: string) {
    const client = this.client;
    if (!client) return;
    const validSessionUuid = toValidUuidOrNull(sessionId);
    if (!validSessionUuid) return;

    const session = await this.getSessionById(sessionId);
    if (!session) return;

    const { data: sessionOrders } = await client
      .from("member_orders")
      .select("*")
      .eq("session_id", validSessionUuid)
      .eq("status", "submitted");
    if (!sessionOrders || sessionOrders.length === 0) return;

    const lockedOrders = sessionOrders.filter(
      (o) => o.payment_status !== "unpaid",
    );
    const unlockedOrders = sessionOrders.filter(
      (o) => o.payment_status === "unpaid",
    );

    if (unlockedOrders.length === 0) return; // everyone already paid/reported

    const lockedShippingSum = lockedOrders.reduce(
      (sum, o) => sum + Number(o.shipping_share),
      0,
    );
    const remainingShipping = Math.max(
      0,
      session.shipping_cost - lockedShippingSum,
    );

    const totalFoodSubtotalUnlocked = unlockedOrders.reduce(
      (sum, o) => sum + Number(o.food_subtotal),
      0,
    );

    for (const order of unlockedOrders) {
      let shippingShare = 0;
      if (session.shipping_split_method === "equal") {
        shippingShare = Math.round(remainingShipping / unlockedOrders.length);
      } else if (session.shipping_split_method === "proportional") {
        shippingShare =
          totalFoodSubtotalUnlocked > 0
            ? Math.round(
                (Number(order.food_subtotal) / totalFoodSubtotalUnlocked) *
                  remainingShipping,
              )
            : 0;
      }

      const grandTotal = Number(order.food_subtotal) + shippingShare;
      await client
        .from("member_orders")
        .update({ shipping_share: shippingShare, grand_total: grandTotal })
        .eq("id", order.id);
    }
  }
}

const supabaseDb = new SupabaseDatabase();

class DatabaseService {
  private get activeDb() {
    if (isSupabaseConfigured) {
      return supabaseDb;
    }
    return localDb;
  }

  getStores() {
    return this.activeDb.getStores();
  }
  getStoreById(id: string) {
    return this.activeDb.getStoreById(id);
  }
  saveStore(storeData: any) {
    return this.activeDb.saveStore(storeData);
  }
  deleteStore(id: string) {
    return this.activeDb.deleteStore(id);
  }
  getCategories(storeId: string) {
    return this.activeDb.getCategories(storeId);
  }
  saveCategory(storeId: string, name: string) {
    return this.activeDb.saveCategory(storeId, name);
  }
  deleteCategory(id: string) {
    return this.activeDb.deleteCategory(id);
  }
  getItems(storeId: string) {
    return this.activeDb.getItems(storeId);
  }
  saveItem(itemData: any) {
    return this.activeDb.saveItem(itemData);
  }
  deleteItem(id: string) {
    return this.activeDb.deleteItem(id);
  }
  importMenuItems(storeId: string, rows: any) {
    return this.activeDb.importMenuItems(storeId, rows);
  }
  importFullStore(storeData: any, rows: any) {
    return this.activeDb.importFullStore(storeData, rows);
  }
  createSnapshotFromStore(storeId: string) {
    return this.activeDb.createSnapshotFromStore(storeId);
  }
  createCustomSnapshot(storeName: string, customItems: any) {
    return this.activeDb.createCustomSnapshot(storeName, customItems);
  }
  getSnapshotById(snapshotId: string) {
    return this.activeDb.getSnapshotById(snapshotId);
  }
  getSnapshotItems(snapshotId: string) {
    return this.activeDb.getSnapshotItems(snapshotId);
  }
  updateSnapshotItem(snapshotItemId: string, updates: any) {
    return this.activeDb.updateSnapshotItem(snapshotItemId, updates);
  }
  getSessions(hostId?: string) {
    return this.activeDb.getSessions(hostId);
  }
  getSessionByShareCode(shareCode: string) {
    return this.activeDb.getSessionByShareCode(shareCode);
  }
  getSessionById(id: string) {
    return this.activeDb.getSessionById(id);
  }
  createSession(sessionData: any) {
    return this.activeDb.createSession(sessionData);
  }
  updateSession(id: string, updates: any) {
    return this.activeDb.updateSession(id, updates);
  }
  duplicateSession(
    sessionId: string,
    newName: string,
    newDeadlineISO: string,
    hostId?: string,
    hostIdentifier?: string,
  ) {
    return this.activeDb.duplicateSession(
      sessionId,
      newName,
      newDeadlineISO,
      hostId,
      hostIdentifier,
    );
  }
  getOrdersForSession(sessionId: string) {
    return this.activeDb.getOrdersForSession(sessionId);
  }
  getOrderForMember(sessionId: string, memberId: string) {
    return this.activeDb.getOrderForMember(sessionId, memberId);
  }
  submitMemberOrder(params: any) {
    return this.activeDb.submitMemberOrder(params);
  }
  updateMemberPaymentStatus(
    orderId: string,
    paymentStatus: MemberPaymentStatus,
  ) {
    return this.activeDb.updateMemberPaymentStatus(orderId, paymentStatus);
  }
  deleteMemberOrder(orderId: string) {
    return this.activeDb.deleteMemberOrder(orderId);
  }
}

export const db = new DatabaseService();

export interface EnrichedOrder extends MemberOrder {
  current_fair_total: number;
  current_fair_shipping_share: number;
  overpaid_amount: number;
}

export interface EnrichedSessionSummary {
  total_overpaid: number;
  total_underpaid: number;
  enriched_orders: EnrichedOrder[];
}

export function enrichOrdersWithOverpayment(
  session: OrderSession,
  orders: MemberOrder[],
): EnrichedSessionSummary {
  const submitted = orders.filter((o) => o.status === "submitted");
  if (submitted.length === 0) {
    return {
      total_overpaid: 0,
      total_underpaid: 0,
      enriched_orders: [],
    };
  }

  const totalFoodAll = submitted.reduce(
    (sum, o) => sum + Number(o.food_subtotal),
    0,
  );
  const shippingCost = Number(session.shipping_cost) || 0;
  const splitMethod = session.shipping_split_method;

  const fairShippingByOrderId = new Map<string, number>();

  submitted.forEach((order) => {
    let fairShare = 0;
    if (splitMethod === "equal") {
      fairShare = Math.round(shippingCost / submitted.length);
    } else if (splitMethod === "proportional") {
      fairShare =
        totalFoodAll > 0
          ? Math.round(
              (Number(order.food_subtotal) / totalFoodAll) * shippingCost,
            )
          : 0;
    } else {
      fairShare = 0;
    }
    fairShippingByOrderId.set(order.id, fairShare);
  });

  let totalOverpaid = 0;
  let totalUnderpaid = 0;

  const enriched: EnrichedOrder[] = submitted.map((order) => {
    const fairShipping = fairShippingByOrderId.get(order.id) ?? 0;
    const currentFairTotal = Number(order.food_subtotal) + fairShipping;
    const isLocked = order.payment_status !== "unpaid";

    let overpaid = 0;
    if (isLocked) {
      const amountPaid = Number(
        order.amount_paid !== undefined && order.amount_paid !== null
          ? order.amount_paid
          : order.grand_total,
      );
      overpaid = amountPaid - currentFairTotal;
      if (overpaid > 0) {
        totalOverpaid += overpaid;
      } else if (overpaid < 0) {
        totalUnderpaid += Math.abs(overpaid);
      }
    }

    return {
      ...order,
      current_fair_shipping_share: fairShipping,
      current_fair_total: currentFairTotal,
      overpaid_amount: overpaid,
    };
  });

  return {
    total_overpaid: totalOverpaid,
    total_underpaid: totalUnderpaid,
    enriched_orders: enriched,
  };
}

export function isSessionExpired(session: { deadline: string }): boolean {
  return new Date(session.deadline).getTime() < Date.now();
}

export function isSessionEffectivelyOpen(session: {
  status: string;
  deadline: string;
}): boolean {
  return session.status === "open" && !isSessionExpired(session);
}

export function isSessionEffectivelyClosed(session: {
  status: string;
  deadline: string;
}): boolean {
  return session.status === "closed" || isSessionExpired(session);
}
