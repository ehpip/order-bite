'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Share2, Clock, CheckCircle2, AlertCircle, Copy, Users, Lock, Unlock, RefreshCw, Plus, Trash2, ShoppingBag, CreditCard, X, ShieldAlert } from 'lucide-react';
import { db } from '@/lib/storage/db-service';
import { OrderSession, MemberOrder, MenuSnapshot, MenuSnapshotItem, MemberPaymentStatus } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import CountdownBadge from '@/components/ui/countdown-badge';
import ShareQRDialog from '@/components/share-qr-dialog';
import CopySummaryMenu from '@/components/copy-summary-menu';
import { useAuth } from '@/lib/auth-context';

export default function SessionManagementPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const searchParams = useSearchParams();
  const { user, hostIdentifier, isHostOwner, isLoading: authLoading } = useAuth();

  const [session, setSession] = useState<OrderSession | null>(null);
  const [snapshot, setSnapshot] = useState<MenuSnapshot | null>(null);
  const [snapshotItems, setSnapshotItems] = useState<MenuSnapshotItem[]>([]);
  const [orders, setOrders] = useState<MemberOrder[]>([]);

  const [shareOpen, setShareOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(30);

  useEffect(() => {
    // Open share modal automatically if redirected from creation
    if (searchParams.get('share') === 'true') {
      setShareOpen(true);
    }
    loadData();
  }, [sessionId]);

  async function loadData() {
    const sess = await db.getSessionById(sessionId);
    if (!sess) return;
    setSession(sess);

    const snap = await db.getSnapshotById(sess.menu_snapshot_id);
    setSnapshot(snap);

    const snapItms = await db.getSnapshotItems(sess.menu_snapshot_id);
    setSnapshotItems(snapItms);

    const memberOrders = await db.getOrdersForSession(sessionId);
    setOrders(memberOrders);
  }

  const isOwner = isHostOwner(session);

  async function handleToggleStatus() {
    if (!session || !isOwner) return;
    const newStatus = session.status === 'open' ? 'closed' : 'open';
    await db.updateSession(session.id, { status: newStatus });
    loadData();
  }

  async function handleExtendDeadline() {
    if (!session || !isOwner) return;
    const currentDeadline = new Date(session.deadline).getTime();
    const now = Date.now();
    const base = currentDeadline > now ? currentDeadline : now;
    const newDeadline = new Date(base + extendMinutes * 60 * 1000).toISOString();

    await db.updateSession(session.id, { deadline: newDeadline, status: 'open' });
    setExtendOpen(false);
    loadData();
  }

  async function handleUpdatePayment(orderId: string, status: MemberPaymentStatus) {
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
    const newSess = await db.duplicateSession(session.id, newName, newDeadline, hostIdentifier, hostIdentifier);
    if (newSess) {
      window.location.href = `/dashboard/orders/${newSess.id}?share=true`;
    }
  }

  if (!session || authLoading) {
    return <div className="p-12 text-center text-slate-500 text-sm">Loading session details...</div>;
  }

  if (!isOwner) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Session Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have permission to manage this group order session. Host access is scoped strictly to session ownership.
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
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const unpaidOrders = orders.filter((o) => o.payment_status !== 'paid');
  const totalPaidAmount = paidOrders.reduce((sum, o) => sum + o.grand_total, 0);
  const totalUnpaidAmount = unpaidOrders.reduce((sum, o) => sum + o.grand_total, 0);

  // Restaurant Food Item Aggregation
  const itemAggregationMap = new Map<string, { name: string; quantity: number; unitPrice: number; total: number }>();
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
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">{session.name}</h1>
              <CountdownBadge deadlineISO={session.deadline} isClosed={session.status === 'closed'} />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Store: <strong>{snapshot?.store_name || 'Restaurant'}</strong></span>
              <span>•</span>
              <span>Share Code: <strong className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">#{session.share_code}</strong></span>
              <span>•</span>
              <span>Host: <strong>{session.host_name || 'Host'}</strong></span>
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
                session.status === 'open'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              {session.status === 'open' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {session.status === 'open' ? 'Lock / Close Order' : 'Reopen Order'}
            </button>
          </div>
        </div>

        {/* Transfer Notes Alert */}
        {session.payment_notes && (
          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
            <span><strong>Payment Instructions:</strong> {session.payment_notes}</span>
          </div>
        )}
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Members</div>
          <div className="text-2xl font-extrabold text-slate-900">{orders.length} people</div>
          <p className="text-[11px] text-slate-500">{paidOrders.length} paid · {unpaidOrders.length} unpaid</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Food Subtotal</div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalFoodSubtotal)}</div>
          <p className="text-[11px] text-slate-500">{aggregatedItemList.length} unique items</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shipping ({session.shipping_split_method})</div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(session.shipping_cost)}</div>
          <p className="text-[11px] text-slate-500">
            {session.shipping_split_method === 'equal' && orders.length > 0
              ? `${formatCurrency(Math.round(session.shipping_cost / orders.length))} / person`
              : session.shipping_split_method}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</div>
          <div className="text-2xl font-extrabold text-orange-600">{formatCurrency(grandTotal)}</div>
          <p className="text-[11px] text-slate-500">Paid: {formatCurrency(totalPaidAmount)} · Unpaid: {formatCurrency(totalUnpaidAmount)}</p>
        </div>
      </div>

      {/* Copy Summaries Panel */}
      <CopySummaryMenu session={session} orders={orders} storeName={snapshot?.store_name} />

      {/* Restaurant Food Aggregation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-slate-900">Restaurant Order Summary (Aggregated Items)</h2>
          </div>
          <span className="text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded-full">
            {aggregatedItemList.reduce((sum, i) => sum + i.quantity, 0)} Total Food Items
          </span>
        </div>

        {aggregatedItemList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No member orders placed yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {aggregatedItemList.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 font-extrabold text-xs flex items-center justify-center">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-slate-900">{item.name}</span>
                </div>
                <div className="text-slate-600 font-semibold">
                  {formatCurrency(item.total)} ({formatCurrency(item.unitPrice)} each)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Orders & Payment Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-bold text-slate-900">Member Orders & Payment Status</h2>
          </div>
          <span className="text-xs text-slate-500">{orders.length} Members</span>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No member orders yet. Share the link so everyone can order!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => {
              const isPaid = order.payment_status === 'paid';
              const isReported = order.payment_status === 'payment_reported';

              return (
                <div key={order.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-base">{order.member_name}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isReported
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPaid ? '✓ Paid' : isReported ? '⏳ Payment Reported' : '❌ Unpaid'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Food: {formatCurrency(order.food_subtotal)} + Shipping Share: {formatCurrency(order.shipping_share)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Total Owed</div>
                        <div className="text-sm font-extrabold text-slate-900">{formatCurrency(order.grand_total)}</div>
                      </div>

                      {/* Payment Toggle Action */}
                      <div className="flex items-center gap-1">
                        {!isPaid ? (
                          <button
                            onClick={() => handleUpdatePayment(order.id, 'paid')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Mark as Paid
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdatePayment(order.id, 'unpaid')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            Mark Unpaid
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMemberOrder(order.id, order.member_name)}
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
                      <div key={i} className="flex justify-between items-center text-slate-700">
                        <span>
                          <strong>{oi.quantity}x</strong> {oi.item_name}{' '}
                          {oi.notes && <span className="text-slate-500 italic">({oi.notes})</span>}
                        </span>
                        <span className="font-semibold">{formatCurrency(oi.subtotal)}</span>
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
            <h3 className="font-bold text-slate-900 text-base">Extend Order Deadline</h3>
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
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
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
    </div>
  );
}
