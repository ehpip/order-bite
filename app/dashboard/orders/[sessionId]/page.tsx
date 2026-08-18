"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  Plus,
  Trash2,
  ShoppingBag,
  CreditCard,
  X,
  ShieldAlert,
  Pencil,
  Check,
  ToggleLeft,
  ToggleRight,
  Edit3,
} from "lucide-react";
import { db, enrichOrdersWithOverpayment } from "@/lib/storage/db-service";
import {
  OrderSession,
  MemberOrder,
  MenuSnapshot,
  MenuSnapshotItem,
  MemberPaymentStatus,
} from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatShippingCost,
} from "@/lib/formatters";
import CountdownBadge from "@/components/ui/countdown-badge";
import ShareQRDialog from "@/components/share-qr-dialog";
import CopySummaryMenu from "@/components/copy-summary-menu";
import { useAuth } from "@/lib/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionManagementPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const searchParams = useSearchParams();
  const {
    user,
    hostIdentifier,
    isHostOwner,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [session, setSession] = useState<OrderSession | null>(null);
  const [snapshot, setSnapshot] = useState<MenuSnapshot | null>(null);
  const [snapshotItems, setSnapshotItems] = useState<MenuSnapshotItem[]>([]);
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [shareOpen, setShareOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  // Item limit editing state
  const [itemLimitsOpen, setItemLimitsOpen] = useState(false);
  const [editingLimitItem, setEditingLimitItem] = useState<{
    id: string;
    name: string;
    limit?: number;
    is_available: boolean;
  } | null>(null);

  useEffect(() => {
    // Open share modal automatically if redirected from creation
    if (searchParams.get("share") === "true") {
      setShareOpen(true);
    }
    loadData();
  }, [sessionId]);

  async function loadData() {
    setDataLoading(true);
    const sess = await db.getSessionById(sessionId);
    if (!sess) {
      setDataLoading(false);
      return;
    }
    setSession(sess);

    const snap = await db.getSnapshotById(sess.menu_snapshot_id);
    setSnapshot(snap);

    const snapItms = await db.getSnapshotItems(sess.menu_snapshot_id);
    setSnapshotItems(snapItms);

    const memberOrders = await db.getOrdersForSession(sessionId);
    setOrders(memberOrders);
    setDataLoading(false);
  }

  const isOwner = isHostOwner(session);

  async function handleToggleStatus() {
    if (!session || !isOwner) return;
    const newStatus = session.status === "open" ? "closed" : "open";
    await db.updateSession(session.id, { status: newStatus });
    loadData();
  }

  async function handleExtendDeadline() {
    if (!session || !isOwner) return;
    const currentDeadline = new Date(session.deadline).getTime();
    const now = Date.now();
    const base = currentDeadline > now ? currentDeadline : now;
    const newDeadline = new Date(
      base + extendMinutes * 60 * 1000,
    ).toISOString();

    await db.updateSession(session.id, {
      deadline: newDeadline,
      status: "open",
    });
    setExtendOpen(false);
    loadData();
  }

  async function handleUpdatePayment(
    orderId: string,
    status: MemberPaymentStatus,
  ) {
    if (!isOwner) return;
    await db.updateMemberPaymentStatus(orderId, status);
    loadData();
  }

  async function handleDeleteMemberOrder(orderId: string, memberName: string) {
    if (!isOwner) return;
    if (confirm(`Remove order for "${memberName}"?`)) {
      await db.deleteMemberOrder(orderId);
      loadData();
    }
  }

  async function handleDuplicateSession() {
    if (!session || !isOwner) return;
    const newName = `${session.name} (Copy)`;
    const newDeadline = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const newSess = await db.duplicateSession(
      session.id,
      newName,
      newDeadline,
      isAuthenticated ? user?.id : undefined,
      hostIdentifier,
    );
    if (newSess) {
      window.location.href = `/dashboard/orders/${newSess.id}?share=true`;
    }
  }

  function handleStartEditDesc() {
    setDescDraft(session?.description || "");
    setEditingDesc(true);
  }

  async function handleSaveDesc() {
    if (!session || !isOwner) return;
    const updated = await db.updateSession(session.id, {
      description: descDraft.trim() || undefined,
    });
    if (updated) {
      setSession(updated);
    }
    setEditingDesc(false);
  }

  async function handleSaveItemLimit() {
    if (!editingLimitItem) return;
    const limitVal =
      editingLimitItem.limit === 0
        ? 0
        : Number(editingLimitItem.limit) || undefined;
    const updated = await db.updateSnapshotItem(editingLimitItem.id, {
      limit: limitVal,
      is_available: editingLimitItem.is_available,
    });
    if (updated) {
      setSnapshotItems((prev) =>
        prev.map((i) => (i.id === editingLimitItem.id ? updated : i)),
      );
    }
    setEditingLimitItem(null);
  }

  async function handleToggleSnapshotItemAvailability(item: MenuSnapshotItem) {
    if (!isOwner) return;
    const updated = await db.updateSnapshotItem(item.id, {
      is_available: !item.is_available,
    });
    if (updated) {
      setSnapshotItems((prev) =>
        prev.map((i) => (i.id === item.id ? updated : i)),
      );
    } else {
      loadData();
    }
  }

  if (!session || authLoading || dataLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-36 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2.5 min-w-0 w-full md:w-3/4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-xl" />
              <Skeleton className="h-3 w-96" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-9 w-32 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2"
            >
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-5 w-28 sm:ml-auto" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-16 ml-auto" />
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-8 w-24 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-full rounded-xl bg-slate-50" />
                  <Skeleton className="h-4 w-5/6 rounded-xl bg-slate-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Session Access Restricted
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have permission to manage this group order session. Host
            access is scoped strictly to session ownership.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/orders"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-xs"
            >
              Back to My Sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalFoodSubtotal = orders.reduce((sum, o) => sum + o.food_subtotal, 0);
  const grandTotal = totalFoodSubtotal + session.shipping_cost;
  const paidOrders = orders.filter((o) => o.payment_status === "paid");
  const unpaidOrders = orders.filter((o) => o.payment_status !== "paid");
  const totalPaidAmount = paidOrders.reduce((sum, o) => sum + o.grand_total, 0);
  const totalUnpaidAmount = unpaidOrders.reduce(
    (sum, o) => sum + o.grand_total,
    0,
  );

  const {
    enriched_orders: enrichedOrders,
    total_overpaid: totalOverpaid,
    total_underpaid: totalUnderpaid,
  } = enrichOrdersWithOverpayment(session, orders);
  const overpaidMembers = enrichedOrders.filter((o) => o.overpaid_amount > 0);

  // Restaurant Food Item Aggregation
  const itemAggregationMap = new Map<
    string,
    { name: string; quantity: number; unitPrice: number; total: number }
  >();
  orders.forEach((o) => {
    o.items.forEach((item) => {
      const key = item.item_name;
      if (!itemAggregationMap.has(key)) {
        itemAggregationMap.set(key, {
          name: item.item_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.subtotal,
        });
      } else {
        const existing = itemAggregationMap.get(key)!;
        existing.quantity += item.quantity;
        existing.total += item.subtotal;
      }
    });
  });

  const aggregatedItemList = Array.from(itemAggregationMap.values());

  // Aggregate quantities by snapshot_item_id for limit checking
  const snapshotItemOrdered = new Map<string, number>();
  orders.forEach((o) => {
    o.items.forEach((item) => {
      snapshotItemOrdered.set(
        item.snapshot_item_id,
        (snapshotItemOrdered.get(item.snapshot_item_id) || 0) + item.quantity,
      );
    });
  });

  const limitedItemsCount = snapshotItems.filter(
    (i) => i.limit !== undefined && i.limit !== null && i.limit > 0,
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sessions
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setItemLimitsOpen(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
            Menu Limits
            {limitedItemsCount > 0 && (
              <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {limitedItemsCount}
              </span>
            )}
          </button>
          <button
            onClick={handleDuplicateSession}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Duplicate Session
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Link & QR
          </button>
        </div>
      </div>

      {/* Main Title & Status Control Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">
                {session.name}
              </h1>
              <CountdownBadge
                deadlineISO={session.deadline}
                isClosed={session.status === "closed"}
              />
            </div>

            {editingDesc ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  placeholder="Add description about this order..."
                  rows={2}
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600 resize-y"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDesc}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDesc(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-1">
                {session.description ? (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1 min-w-0">
                    {session.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic flex-1">
                    No description added yet.
                  </p>
                )}
                {isOwner && (
                  <button
                    onClick={handleStartEditDesc}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit description"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 flex items-center gap-2 mt-2">
              <span>
                Store: <strong>{snapshot?.store_name || "Restaurant"}</strong>
              </span>
              <span>•</span>
              <span>
                Share Code:{" "}
                <strong className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  #{session.share_code}
                </strong>
              </span>
              <span>•</span>
              <span>
                Host: <strong>{session.host_name || "Host"}</strong>
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExtendOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              Extend Deadline
            </button>
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                session.status === "open"
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
              }`}
            >
              {session.status === "open" ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              {session.status === "open"
                ? "Lock / Close Order"
                : "Reopen Order"}
            </button>
          </div>
        </div>

        {/* Transfer Notes Alert */}
        {session.payment_notes && (
          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Payment Instructions:</strong> {session.payment_notes}
            </span>
          </div>
        )}
      </div>

      {/* Overpayment Reconciliation Alert */}
      {totalOverpaid > 0 && (
        <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-5 h-5 text-sky-700" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-sky-900">
                  Overpayment Reconciliation Required
                </h3>
                <p className="text-xs text-sky-700 leading-relaxed mt-1">
                  <strong>{overpaidMembers.length}</strong> member
                  {overpaidMembers.length !== 1 ? "s" : ""} overpaid because new
                  people joined after they paid. The total amount to reconcile
                  is{" "}
                  <strong className="text-sky-800">
                    {formatCurrency(totalOverpaid)}
                  </strong>
                  . Please refund the difference or offset it against a future
                  order.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-sky-500 font-bold uppercase tracking-wide">
                Total To Refund
              </div>
              <div className="text-2xl font-extrabold text-sky-700">
                +{formatCurrency(totalOverpaid)}
              </div>
            </div>
          </div>
          <div className="bg-white/80 rounded-xl border border-sky-200/70 divide-y divide-sky-100 overflow-hidden">
            {overpaidMembers.map((member) => (
              <div
                key={member.id}
                className="p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                    {member.member_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sky-900 truncate">
                      {member.member_name}
                    </div>
                    <div className="text-[10px] text-sky-600">
                      Paid{" "}
                      {formatCurrency(
                        Number(member.amount_paid ?? member.grand_total),
                      )}{" "}
                      · Fair share now{" "}
                      {formatCurrency(member.current_fair_total)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-sky-700">
                    +{formatCurrency(member.overpaid_amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-sky-600 leading-relaxed">
            💡 Tip: Each member can see the exact amount they&apos;re owed on
            their order page. Contact them individually to arrange refunds or
            credit them for next time.
          </p>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Members
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {orders.length} people
          </div>
          <p className="text-[11px] text-slate-500">
            {paidOrders.length} paid · {unpaidOrders.length} unpaid
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Food Subtotal
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalFoodSubtotal)}
          </div>
          <p className="text-[11px] text-slate-500">
            {aggregatedItemList.length} unique items
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Shipping ({session.shipping_split_method})
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatShippingCost(session.shipping_cost)}
          </div>
          <p className="text-[11px] text-slate-500">
            {session.shipping_split_method === "equal" && orders.length > 0
              ? session.shipping_cost <= 0
                ? "Free"
                : `${formatCurrency(Math.round(session.shipping_cost / orders.length))} / person`
              : session.shipping_split_method}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Grand Total
          </div>
          <div className="text-2xl font-extrabold text-orange-600">
            {formatCurrency(grandTotal)}
          </div>
          <p className="text-[11px] text-slate-500">
            Paid: {formatCurrency(totalPaidAmount)} · Unpaid:{" "}
            {formatCurrency(totalUnpaidAmount)}
          </p>
        </div>
      </div>

      {/* Copy Summaries Panel */}
      <CopySummaryMenu
        session={session}
        orders={orders}
        storeName={snapshot?.store_name}
      />

      {/* Restaurant Food Aggregation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-slate-900">
              Restaurant Order Summary (Aggregated Items)
            </h2>
          </div>
          <span className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
            {aggregatedItemList.reduce((sum, i) => sum + i.quantity, 0)} Total
            Food Items
          </span>
        </div>

        {aggregatedItemList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No member orders placed yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {aggregatedItemList.map((item, idx) => {
              const snapshotMatch = snapshotItems.find(
                (si) => si.name === item.name,
              );
              const alreadyOrdered = snapshotMatch
                ? (snapshotItemOrdered.get(snapshotMatch.id) ?? 0)
                : item.quantity;
              const hasLimit =
                snapshotMatch &&
                snapshotMatch.limit !== undefined &&
                snapshotMatch.limit !== null;
              const limit = snapshotMatch?.limit;
              const remaining =
                hasLimit && typeof limit === "number"
                  ? Math.max(0, limit - alreadyOrdered)
                  : null;
              const pct =
                hasLimit && typeof limit === "number" && limit > 0
                  ? Math.min(100, (alreadyOrdered / limit) * 100)
                  : null;
              return (
                <div
                  key={idx}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                        {item.quantity}x
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {item.name}
                          </span>
                          {hasLimit && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                remaining === 0
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : remaining !== null && remaining <= 2
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {alreadyOrdered}/{limit}
                              {remaining === 0
                                ? " SOLD OUT"
                                : remaining !== null && remaining <= 2
                                  ? ` • ${remaining} left`
                                  : " ordered"}
                            </span>
                          )}
                        </div>
                        {hasLimit && pct !== null && (
                          <div className="mt-2 w-full max-w-[260px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                remaining === 0
                                  ? "bg-rose-500"
                                  : remaining !== null && remaining <= 2
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-600 font-semibold sm:text-right">
                    {formatCurrency(item.total)} (
                    {formatCurrency(item.unitPrice)} each)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Member Orders & Payment Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-slate-900">
              Member Orders & Payment Status
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {orders.length} Members
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No member orders yet. Share the link so everyone can order!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const isPaid = order.payment_status === "paid";
              const isReported = order.payment_status === "payment_reported";
              const enriched = enrichedOrders.find((eo) => eo.id === order.id);
              const overpaidAmt = enriched?.overpaid_amount ?? 0;

              return (
                <div key={order.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">
                          {order.member_name}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : isReported
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isPaid
                            ? "✓ Paid"
                            : isReported
                              ? "⏳ Payment Reported"
                              : "❌ Unpaid"}
                        </span>
                        {overpaidAmt > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            <RefreshCw className="w-2.5 h-2.5" />
                            Owes +{formatCurrency(overpaidAmt)} back
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Food: {formatCurrency(order.food_subtotal)} + Shipping
                        Share: {formatShippingCost(order.shipping_share)}
                        {overpaidAmt > 0 && (
                          <span className="text-sky-600 ml-1.5">
                            · Fair now:{" "}
                            {formatShippingCost(
                              enriched!.current_fair_shipping_share,
                            )}{" "}
                            shipping
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">
                          Total Owed
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {formatCurrency(order.grand_total)}
                        </div>
                        {overpaidAmt > 0 && (
                          <div className="text-[10px] font-bold text-sky-600">
                            Overpaid by {formatCurrency(overpaidAmt)}
                          </div>
                        )}
                      </div>

                      {/* Payment Toggle Action */}
                      <div className="flex items-center gap-1">
                        {!isPaid ? (
                          <button
                            onClick={() =>
                              handleUpdatePayment(order.id, "paid")
                            }
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleUpdatePayment(order.id, "unpaid")
                            }
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Mark Unpaid
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDeleteMemberOrder(order.id, order.member_name)
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Remove Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Pills */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                    {order.items.map((oi, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-slate-700"
                      >
                        <span>
                          <strong>{oi.quantity}x</strong> {oi.item_name}{" "}
                          {oi.notes && (
                            <span className="text-slate-500 italic">
                              ({oi.notes})
                            </span>
                          )}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(oi.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share QR Dialog */}
      <ShareQRDialog
        opened={shareOpen}
        onClose={() => setShareOpen(false)}
        orderName={session.name}
        shareCode={session.share_code}
      />

      {/* Extend Deadline Modal */}
      {extendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <button
              onClick={() => setExtendOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">
              Extend Order Deadline
            </h3>
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-600">
                Choose how many minutes to add to the ordering deadline:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setExtendMinutes(mins)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      extendMinutes === mins
                        ? "bg-orange-600 text-white border-orange-600"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    +{mins} Minutes
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setExtendOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtendDeadline}
                  className="px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700"
                >
                  Confirm Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Limits Management Modal */}
      {itemLimitsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col relative">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                  Session Menu Limits
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Set per-session quantity caps. Leave blank for unlimited.
                </p>
              </div>
              <button
                onClick={() => setItemLimitsOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-2">
              {snapshotItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No menu items in this session.
                </div>
              ) : (
                snapshotItems.map((item) => {
                  const alreadyOrdered = snapshotItemOrdered.get(item.id) ?? 0;
                  const hasLimit =
                    item.limit !== undefined && item.limit !== null;
                  const remaining = hasLimit
                    ? Math.max(0, (item.limit ?? 0) - alreadyOrdered)
                    : null;
                  const pct =
                    hasLimit && (item.limit ?? 0) > 0
                      ? Math.min(
                          100,
                          (alreadyOrdered / (item.limit ?? 1)) * 100,
                        )
                      : null;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        !item.is_available
                          ? "bg-slate-50 border-slate-200 opacity-70"
                          : "bg-white border-slate-200 hover:border-orange-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {item.name}
                            </h4>
                            {hasLimit && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  remaining === 0
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : remaining !== null && remaining <= 2
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                              >
                                {alreadyOrdered}/{item.limit}
                                {remaining === 0
                                  ? " SOLD OUT"
                                  : remaining !== null
                                    ? ` • ${remaining} left`
                                    : ""}
                              </span>
                            )}
                            {!hasLimit && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                                Unlimited
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatCurrency(item.price)} each
                          </p>
                          {hasLimit && pct !== null && (
                            <div className="mt-2 w-full max-w-[300px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  remaining === 0
                                    ? "bg-rose-500"
                                    : remaining !== null && remaining <= 2
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              handleToggleSnapshotItemAvailability(item)
                            }
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.is_available
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                            title={
                              item.is_available
                                ? "Mark unavailable"
                                : "Mark available"
                            }
                          >
                            {item.is_available ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setEditingLimitItem({
                                id: item.id,
                                name: item.name,
                                limit: item.limit,
                                is_available: item.is_available,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Limit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setItemLimitsOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Limit Modal */}
      {editingLimitItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative">
            <button
              onClick={() => setEditingLimitItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Edit Item Limit
              </h3>
              <p className="text-sm font-semibold text-orange-600 mt-1">
                {editingLimitItem.name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Per-Session Quantity Limit
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    placeholder="Leave blank for unlimited"
                    value={
                      editingLimitItem.limit === undefined
                        ? ""
                        : editingLimitItem.limit
                    }
                    onChange={(e) =>
                      setEditingLimitItem({
                        ...editingLimitItem,
                        limit:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-hidden focus:border-orange-600 focus:ring-2 focus:ring-orange-600/15"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  The total quantity ordered by all members combined cannot
                  exceed this number. Set 0 to block new orders for this item.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Item Available
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Toggle off to hide from members
                  </p>
                </div>
                <button
                  onClick={() =>
                    setEditingLimitItem({
                      ...editingLimitItem,
                      is_available: !editingLimitItem.is_available,
                    })
                  }
                  className={`w-12 h-7 rounded-full transition-colors cursor-pointer relative ${
                    editingLimitItem.is_available
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                      editingLimitItem.is_available ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditingLimitItem(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemLimit}
                className="px-5 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
