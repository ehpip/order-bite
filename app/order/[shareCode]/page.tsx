"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  CreditCard,
  ChevronRight,
  Edit2,
  Utensils,
  Send,
  X,
  Check,
  Copy,
  Users,
} from "lucide-react";
import { db } from "@/lib/storage/db-service";
import {
  OrderSession,
  MenuSnapshot,
  MenuSnapshotItem,
  MemberOrder,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import CountdownBadge from "@/components/ui/countdown-badge";
import { getInitials, getAvatarColor } from "@/lib/utils";

export default function PublicMemberOrderPage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const { shareCode } = use(params);

  const [session, setSession] = useState<OrderSession | null>(null);
  const [snapshot, setSnapshot] = useState<MenuSnapshot | null>(null);
  const [snapshotItems, setSnapshotItems] = useState<MenuSnapshotItem[]>([]);
  const [existingOrder, setExistingOrder] = useState<MemberOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allOrders, setAllOrders] = useState<MemberOrder[]>([]);

  // Member Identity
  const [memberName, setMemberName] = useState<string>("");
  const [nameSubmitted, setNameSubmitted] = useState<boolean>(false);

  // Menu Search & Categories
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "sold_out"
  >("all");

  // Cart State: Map of snapshot_item_id -> { quantity, notes }
  const [cart, setCart] = useState<
    Map<string, { quantity: number; notes: string }>
  >(new Map());

  // UI Drawer/Modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [copiedPayment, setCopiedPayment] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [shareCode]);

  const PAYMENT_PROVIDERS = [
    "BCA",
    "BRI",
    "BNI",
    "Mandiri",
    "BSI",
    "CIMB",
    "Permata",
    "Danamon",
    "OCBC",
    "BTN",
    "GoPay",
    "OVO",
    "DANA",
    "ShopeePay",
    "LinkAja",
  ];

  function parsePaymentInstructions(text: string) {
    const results: {
      provider: string;
      number: string;
    }[] = [];

    const providerPattern = PAYMENT_PROVIDERS.join("|");

    const regex = new RegExp(
      `(${providerPattern})\\s*[:\\-]?\\s*(\\d{8,16})`,
      "gi",
    );

    let match;

    while ((match = regex.exec(text)) !== null) {
      results.push({
        provider: match[1],
        number: match[2],
      });
    }

    return results;
  }

  const handleCopyPayment = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);

      setCopiedPayment(number);

      setTimeout(() => {
        setCopiedPayment(null);
      }, 2000);
    } catch {
      alert("Failed to copy payment number.");
    }
  };

  async function loadData() {
    const sess = await db.getSessionByShareCode(shareCode);
    if (!sess) {
      setNotFound(true);
      return;
    }
    setSession(sess);

    const snap = await db.getSnapshotById(sess.menu_snapshot_id);
    setSnapshot(snap);

    const items = await db.getSnapshotItems(sess.menu_snapshot_id);
    setSnapshotItems(items);

    const sessionOrders = await db.getOrdersForSession(sess.id);
    setAllOrders(sessionOrders);

    // Check if member already entered name on this device
    const savedName = localStorage.getItem(`member_name_${sess.id}`);
    const savedMemberId = localStorage.getItem(`member_id_${sess.id}`);

    if (savedName || savedMemberId) {
      if (savedName) setMemberName(savedName);
      setNameSubmitted(true);

      // Fetch existing order if any (first by member_id, then fallback to member_name)
      let order: MemberOrder | null = null;
      if (savedMemberId) {
        order = await db.getOrderForMember(sess.id, savedMemberId);
      }
      if (!order && savedName) {
        const match = sessionOrders.find(
          (o) =>
            o.member_name.trim().toLowerCase() ===
            savedName.trim().toLowerCase(),
        );
        if (match) {
          order = match;
          localStorage.setItem(`member_id_${sess.id}`, match.member_id);
        }
      }

      if (order) {
        setExistingOrder(order);
        // Pre-fill cart with existing items matching snapshot items accurately
        const newCart = new Map<string, { quantity: number; notes: string }>();
        order.items.forEach((item) => {
          const match = items.find(
            (si) =>
              String(si.id) === String(item.snapshot_item_id) ||
              si.name.trim().toLowerCase() ===
                item.item_name.trim().toLowerCase(),
          );
          const key = match ? match.id : item.snapshot_item_id;
          newCart.set(key, {
            quantity: item.quantity,
            notes: item.notes || "",
          });
        });
        setCart(newCart);
      }
    }
  }

  const handleStartOrdering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !session) return;

    const trimmedName = memberName.trim();
    let memberId = localStorage.getItem(`member_id_${session.id}`);

    // Check if an order already exists for this member name in this session
    const sessionOrders = await db.getOrdersForSession(session.id);
    const existingForName = sessionOrders.find(
      (o) => o.member_name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (existingForName) {
      memberId = existingForName.member_id;
      setExistingOrder(existingForName);
      const newCart = new Map<string, { quantity: number; notes: string }>();
      existingForName.items.forEach((item) => {
        const match = snapshotItems.find(
          (si) =>
            String(si.id) === String(item.snapshot_item_id) ||
            si.name.trim().toLowerCase() ===
              item.item_name.trim().toLowerCase(),
        );
        const key = match ? match.id : item.snapshot_item_id;
        newCart.set(key, { quantity: item.quantity, notes: item.notes || "" });
      });
      setCart(newCart);
    } else if (!memberId) {
      memberId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }

    localStorage.setItem(`member_id_${session.id}`, memberId);
    localStorage.setItem(`member_name_${session.id}`, trimmedName);
    setNameSubmitted(true);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const targetItem = snapshotItems.find(
      (i) => String(i.id) === String(itemId),
    );
    if (delta > 0 && targetItem && targetItem.is_available === false) {
      alert(
        `Sorry, "${targetItem.name}" is currently sold out and unavailable to order.`,
      );
      return;
    }

    const newCart = new Map(cart);
    let keyToUse = itemId;
    for (const k of newCart.keys()) {
      if (String(k) === String(itemId)) {
        keyToUse = k;
        break;
      }
    }

    const current = newCart.get(keyToUse) || { quantity: 0, notes: "" };
    const newQty = Math.max(0, current.quantity + delta);

    if (newQty === 0) {
      newCart.delete(keyToUse);
    } else {
      newCart.set(keyToUse, { ...current, quantity: newQty });
    }
    setCart(newCart);
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    const newCart = new Map(cart);
    let keyToUse = itemId;
    for (const k of newCart.keys()) {
      if (String(k) === String(itemId)) {
        keyToUse = k;
        break;
      }
    }
    const current = newCart.get(keyToUse) || { quantity: 1, notes: "" };
    newCart.set(keyToUse, { ...current, notes });
    setCart(newCart);
  };

  // Cart Calculations
  let totalCartItemsCount = 0;
  let cartFoodSubtotal = 0;

  cart.forEach((val, itemId) => {
    const item = snapshotItems.find((i) => String(i.id) === String(itemId));
    if (item && item.is_available !== false) {
      totalCartItemsCount += val.quantity;
      cartFoodSubtotal += item.price * val.quantity;
    }
  });

  const hasUnsavedChanges = React.useMemo(() => {
    // No submitted order yet.
    // Any cart item means there is something to submit.
    if (!existingOrder) {
      return totalCartItemsCount > 0;
    }

    const submittedItems = new Map<
      string,
      {
        quantity: number;
        notes: string;
      }
    >();

    existingOrder.items.forEach((item) => {
      const match = snapshotItems.find(
        (si) =>
          String(si.id) === String(item.snapshot_item_id) ||
          si.name.trim().toLowerCase() === item.item_name.trim().toLowerCase(),
      );

      const key = match ? String(match.id) : String(item.snapshot_item_id);

      submittedItems.set(key, {
        quantity: item.quantity,
        notes: item.notes || "",
      });
    });

    // Different number of item types
    if (cart.size !== submittedItems.size) {
      return true;
    }

    // Compare current cart against submitted order
    for (const [itemId, cartItem] of cart.entries()) {
      const submittedItem = submittedItems.get(String(itemId));

      if (!submittedItem) {
        return true;
      }

      if (
        submittedItem.quantity !== cartItem.quantity ||
        submittedItem.notes.trim() !== cartItem.notes.trim()
      ) {
        return true;
      }
    }

    return false;
  }, [cart, existingOrder, snapshotItems, totalCartItemsCount]);

  const handleSubmitOrder = async () => {
    if (!session || !memberName.trim() || totalCartItemsCount === 0) return;

    // Check for any unavailable items currently in cart
    const unavailableInCart: string[] = [];
    cart.forEach((val, itemId) => {
      const item = snapshotItems.find((i) => String(i.id) === String(itemId));
      if (item && item.is_available === false && val.quantity > 0) {
        unavailableInCart.push(item.name);
      }
    });

    if (unavailableInCart.length > 0) {
      alert(
        `The following item(s) are sold out and cannot be ordered: ${unavailableInCart.join(", ")}. Please remove them from your cart.`,
      );
      return;
    }

    try {
      setSubmitting(true);

      const memberId =
        localStorage.getItem(`member_id_${session.id}`) || `mem-${Date.now()}`;

      const reqItems = Array.from(cart.entries()).map(([itemId, val]) => {
        const match = snapshotItems.find(
          (i) => String(i.id) === String(itemId),
        );

        return {
          snapshot_item_id: match ? match.id : itemId,
          quantity: val.quantity,
          notes: val.notes,
        };
      });

      const submittedOrder = await db.submitMemberOrder({
        session_id: session.id,
        member_id: memberId,
        member_name: memberName.trim(),
        items: reqItems,
      });

      setExistingOrder(submittedOrder);
      setCheckoutOpen(false);
      setSuccessMessage("Your order has been submitted successfully!");

      // Reload the submitted order/cart state first
      await loadData();

      // Scroll to the top so the member immediately sees
      // their confirmed order and payment instructions.
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      alert(err.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportPayment = async () => {
    if (!existingOrder) return;
    await db.updateMemberPaymentStatus(existingOrder.id, "payment_reported");
    loadData();
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Group Order Session Not Found
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            We couldn&apos;t find a group order session with share code{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800 font-semibold">
              {shareCode}
            </code>
            . Please verify the link with the group order host or create a new
            session.
          </p>
          <Link
            href="/"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-500 text-sm flex-col gap-3">
        <div className="w-7 h-7 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium text-slate-600">
          Loading group order session...
        </span>
      </div>
    );
  }

  const isExpired = new Date(session.deadline).getTime() < Date.now();
  const isClosed = session.status === "closed" || isExpired;

  // Extract Categories
  const categoryNames = Array.from(
    new Set(snapshotItems.map((i) => i.category_name || "General")),
  );

  const availableCount = snapshotItems.filter(
    (i) => i.is_available !== false,
  ).length;
  const soldOutCount = snapshotItems.filter(
    (i) => i.is_available === false,
  ).length;

  const filteredItems = snapshotItems.filter((item) => {
    const isAvailable = item.is_available !== false;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && isAvailable) ||
      (availabilityFilter === "sold_out" && !isAvailable);

    const matchesCat =
      selectedCategory === "All" || item.category_name === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(search.toLowerCase()));

    return matchesAvailability && matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Top Mobile Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-2xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                {session.name}
              </h1>
              <p className="text-[11px] text-slate-500">
                {snapshot?.store_name || "Group Food Order"}
              </p>
            </div>
          </div>
          <CountdownBadge deadlineISO={session.deadline} isClosed={isClosed} />
        </div>
      </header>
      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Participants Section */}
        {session && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Session Participants
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {allOrders.length} {allOrders.length === 1 ? 'person' : 'people'} joined this group order
                  </p>
                </div>
              </div>
              <div className="flex -space-x-1.5">
                {allOrders.slice(0, 5).map((o, idx) => (
                  <div
                    key={o.id || idx}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 border-white ${getAvatarColor(o.member_name)}`}
                    title={o.member_name}
                  >
                    {getInitials(o.member_name)}
                  </div>
                ))}
                {allOrders.length > 5 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-extrabold border-2 border-white bg-slate-100 text-slate-600">
                    +{allOrders.length - 5}
                  </div>
                )}
              </div>
            </div>

            {allOrders.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                <Users className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                Be the first to join this order!
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {allOrders.map((order) => {
                  const isCurrentUser =
                    existingOrder && existingOrder.id === order.id;
                  return (
                    <div
                      key={order.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                        isCurrentUser
                          ? 'bg-orange-50 border-2 border-orange-200'
                          : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold border-2 shrink-0 ${getAvatarColor(
                          order.member_name,
                        )}`}
                      >
                        {getInitials(order.member_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {order.member_name}
                          </span>
                          {isCurrentUser && (
                            <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-wide bg-orange-600 text-white px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {order.items.length > 0
                            ? order.items
                                .map((i) => `${i.quantity}x ${i.item_name}`)
                                .join(', ')
                            : 'No items ordered yet'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {order.payment_status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Paid
                            </span>
                          ) : order.payment_status === 'payment_reported' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              Verifying
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />
                              Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-extrabold text-slate-900">
                          {formatCurrency(order.grand_total)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {order.items.reduce(
                            (sum, i) => sum + i.quantity,
                            0,
                          )}{' '}
                          items
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {allOrders.length > 0 && (
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>
                  Total Collected ({allOrders.filter(
                    (o) => o.payment_status === 'paid',
                  ).length}
                  /{allOrders.length} paid)
                </span>
                <span className="font-extrabold text-slate-900">
                  {formatCurrency(
                    allOrders.reduce(
                      (sum, o) =>
                        o.payment_status === 'paid' ? sum + o.grand_total : sum,
                      0,
                    ),
                  )}{' '}
                  /{' '}
                  {formatCurrency(
                    allOrders.reduce((sum, o) => sum + o.grand_total, 0),
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Member Name Prompt Modal or Card */}
        {!nameSubmitted ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 my-6">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Join Group Food Order
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ordering from <strong>{snapshot?.store_name}</strong>. Enter
                your name to view the menu and pick your food!
              </p>
            </div>

            <form onSubmit={handleStartOrdering} className="space-y-3">
              <input
                type="text"
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Enter your name (e.g. Afif)"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-medium outline-hidden focus:border-orange-600 text-center"
              />
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-xs cursor-pointer"
              >
                Start Ordering Menu →
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Success Toast */}
            {successMessage && (
              <div className="bg-emerald-600 text-white p-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4" /> {successMessage}
              </div>
            )}

            {/* Existing Submitted Order Summary Banner */}
            {existingOrder && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />

                    <div>
                      <div className="text-sm font-extrabold text-emerald-900">
                        Order Submitted Successfully
                      </div>

                      <div className="text-[11px] text-emerald-700">
                        Hi {existingOrder.member_name}, your order has been
                        recorded.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-900">
                    {formatCurrency(existingOrder.grand_total)}
                  </span>
                </div>

                <div className="text-sm text-emerald-800 space-y-2 bg-white/80 p-2.5 rounded-xl">
                  {existingOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        - {it.quantity}x {it.item_name}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Payment instructions */}
                {session.payment_notes && (
                  <div className="bg-white border-2 border-emerald-300 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-emerald-700" />
                      </div>

                      <div>
                        <div className="text-sm font-extrabold text-emerald-900">
                          Payment Instructions
                        </div>

                        <div className="text-[11px] font-medium text-emerald-700">
                          Please transfer your payment to:
                        </div>
                      </div>
                    </div>

                    {/* Original payment instructions */}
                    <div className="text-sm font-semibold text-slate-700 leading-relaxed">
                      {session.payment_notes}
                    </div>

                    {/* Detected payment numbers */}
                    {parsePaymentInstructions(session.payment_notes).length >
                      0 && (
                      <div className="space-y-2 pt-2 border-t border-emerald-100">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Quick Copy
                        </div>

                        {parsePaymentInstructions(session.payment_notes).map(
                          ({ provider, number }) => (
                            <div
                              key={`${provider}-${number}`}
                              className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3"
                            >
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-slate-500">
                                  {provider}
                                </div>

                                <div className="text-base font-extrabold tracking-wide text-slate-900">
                                  {number}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopyPayment(number)}
                                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                  copiedPayment === number
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {copiedPayment === number ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {existingOrder.payment_status === "unpaid" ? (
                    <button
                      onClick={handleReportPayment}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 rounded-xl transition-colors text-center cursor-pointer"
                    >
                      I&apos;ve Paid
                    </button>
                  ) : existingOrder.payment_status === "payment_reported" ? (
                    <span className="flex-1 bg-amber-100 text-amber-800 font-bold text-xs py-1.5 rounded-xl text-center">
                      ⏳ Payment Reported (Host verifying)
                    </span>
                  ) : (
                    <span className="flex-1 bg-emerald-200 text-emerald-900 font-bold text-xs py-1.5 rounded-xl text-center">
                      ✓ Payment Confirmed
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Closed Banner */}
            {isClosed && (
              <div className="bg-slate-800 text-white p-3.5 rounded-2xl text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-400 shrink-0" />
                <span>
                  <strong>Ordering is Closed.</strong> This session is no longer
                  accepting new food orders or changes.
                </span>
              </div>
            )}

            {/* Category Filter Tabs & Search */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search food & beverages..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                    selectedCategory === "All"
                      ? "bg-orange-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  All Categories
                </button>
                {categoryNames.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-orange-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Availability Filter Pills */}
              {soldOutCount > 0 && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400 font-semibold mr-1">
                    Status:
                  </span>
                  <button
                    onClick={() => setAvailabilityFilter("all")}
                    className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      availabilityFilter === "all"
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    All ({snapshotItems.length})
                  </button>
                  <button
                    onClick={() => setAvailabilityFilter("available")}
                    className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      availabilityFilter === "available"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    Available ({availableCount})
                  </button>
                  <button
                    onClick={() => setAvailabilityFilter("sold_out")}
                    className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      availabilityFilter === "sold_out"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    Sold Out ({soldOutCount})
                  </button>
                </div>
              )}
            </div>

            {/* Menu Items List */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
                  No menu items found matching your filter.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const cartVal =
                    cart.get(item.id) ||
                    Array.from(cart.entries()).find(
                      ([k]) => String(k) === String(item.id),
                    )?.[1];
                  const quantity = cartVal?.quantity || 0;
                  const isAvailable = item.is_available !== false;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border shadow-2xs flex gap-3.5 items-center justify-between transition-colors ${
                        isAvailable
                          ? "bg-white border-slate-200"
                          : "bg-slate-50/80 border-slate-200/80 opacity-80"
                      }`}
                    >
                      {item.image && (
                        <div className="relative shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className={`w-20 h-20 rounded-xl object-cover border shrink-0 ${
                              !isAvailable ? "grayscale opacity-75" : ""
                            }`}
                          />
                          {!isAvailable && (
                            <div className="absolute inset-0 bg-slate-900/40 rounded-xl flex items-center justify-center">
                              <span className="text-[9px] font-extrabold text-white bg-rose-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Sold Out
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`font-bold text-sm line-clamp-1 ${isAvailable ? "text-slate-900" : "text-slate-500 line-through"}`}
                          >
                            {item.name}
                          </h3>
                          {isAvailable ? (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                              Available
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
                              Sold Out
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {item.description}
                        </p>
                        <div
                          className={`text-sm font-extrabold ${isAvailable ? "text-orange-600" : "text-slate-400"}`}
                        >
                          {formatCurrency(item.price)}
                        </div>

                        {/* Custom note field when quantity > 0 */}
                        {quantity > 0 && isAvailable && (
                          <input
                            type="text"
                            value={cartVal?.notes || ""}
                            onChange={(e) =>
                              updateItemNotes(item.id, e.target.value)
                            }
                            placeholder="Note: e.g. Less ice, extra spicy"
                            className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg outline-hidden focus:border-orange-500 bg-slate-50"
                          />
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      {!isClosed && (
                        <div className="shrink-0">
                          {!isAvailable ? (
                            <button
                              disabled
                              className="bg-rose-50 text-rose-600 font-bold text-xs px-3 py-2 rounded-xl border border-rose-200 cursor-not-allowed opacity-90"
                            >
                              Sold Out
                            </button>
                          ) : quantity === 0 ? (
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs px-3 py-2 rounded-xl border border-orange-200 transition-colors cursor-pointer"
                            >
                              + Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 rounded-lg bg-white text-slate-700 font-bold flex items-center justify-center shadow-2xs hover:bg-slate-50 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-bold text-xs text-slate-900 w-5 text-center">
                                {quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 rounded-lg bg-orange-600 text-white font-bold flex items-center justify-center shadow-2xs hover:bg-orange-700 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* Mobile Sticky Order Summary Bar */}
      {nameSubmitted && !isClosed && totalCartItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 font-medium">
                {!existingOrder
                  ? `Your Order (${totalCartItemsCount} items)`
                  : hasUnsavedChanges
                    ? "Unsaved Changes"
                    : "Order Submitted"}
              </div>

              <div className="text-base font-extrabold text-slate-900">
                {formatCurrency(cartFoodSubtotal)}
              </div>
            </div>

            {existingOrder && !hasUnsavedChanges ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-5 py-3 rounded-xl text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Order Submitted
              </div>
            ) : (
              <button
                onClick={() => setCheckoutOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md flex items-center gap-2 transition-colors cursor-pointer"
              >
                {existingOrder ? "Update Order" : "Review & Submit"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      {/* Checkout Review Drawer / Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 relative animate-slideUp">
            <button
              onClick={() => setCheckoutOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base">
              {existingOrder ? "Review Order Changes" : "Review Your Order"}
            </h3>

            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded-xl text-xs font-semibold text-slate-700 flex justify-between">
                <span>
                  Ordering for: <strong>{memberName}</strong>
                </span>
                <span>
                  Store: <strong>{snapshot?.store_name}</strong>
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {Array.from(cart.entries()).map(([itemId, val]) => {
                  const item = snapshotItems.find(
                    (i) => String(i.id) === String(itemId),
                  );
                  if (!item) return null;

                  return (
                    <div
                      key={itemId}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {val.quantity}x {item.name}
                        </div>
                        {val.notes && (
                          <div className="text-[11px] text-slate-500 italic">
                            Note: {val.notes}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800">
                        {formatCurrency(item.price * val.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Food Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(cartFoodSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>
                    Shipping Allocation ({session.shipping_split_method})
                  </span>
                  <span>Calculated by host</span>
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-colors cursor-pointer"
              >
                {submitting
                  ? existingOrder
                    ? "Updating Order..."
                    : "Submitting Order..."
                  : existingOrder
                    ? `Confirm & Update Order (${formatCurrency(cartFoodSubtotal)})`
                    : `Confirm & Place Order (${formatCurrency(cartFoodSubtotal)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
