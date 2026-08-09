'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, ListOrdered, Share2, ArrowRight, Clock, Users, DollarSign, Filter, Search } from 'lucide-react';
import { db } from '@/lib/storage/db-service';
import { OrderSession, MemberOrder } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import CountdownBadge from '@/components/ui/countdown-badge';
import ShareQRDialog from '@/components/share-qr-dialog';

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [ordersMap, setOrdersMap] = useState<Map<string, MemberOrder[]>>(new Map());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [shareSession, setShareSession] = useState<OrderSession | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const list = await db.getSessions();
    setSessions(list);

    const map = new Map<string, MemberOrder[]>();
    for (const s of list) {
      const orders = await db.getOrdersForSession(s.id);
      map.set(s.id, orders);
    }
    setOrdersMap(map);
  }

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.share_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Group Order Sessions</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Active and historical group food orders with payment tracking and summaries.
          </p>
        </div>
        <Link
          href="/dashboard/orders/new"
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          Create Group Order
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions by name or share code..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm outline-hidden focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-white outline-hidden font-medium text-slate-700"
          >
            <option value="all">All Sessions</option>
            <option value="open">Open Only</option>
            <option value="closed">Closed / Past</option>
          </select>
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No group order sessions found. Click "+ Create Group Order" to start!
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const memberOrders = ordersMap.get(session.id) || [];
            const foodSubtotal = memberOrders.reduce((sum, o) => sum + o.food_subtotal, 0);
            const grandTotal = foodSubtotal + session.shipping_cost;
            const paidCount = memberOrders.filter((o) => o.payment_status === 'paid').length;

            return (
              <div
                key={session.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{session.name}</h3>
                    <CountdownBadge deadlineISO={session.deadline} isClosed={session.status === 'closed'} />
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      #{session.share_code}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {memberOrders.length} Members ({paidCount} Paid)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Deadline: {formatDate(session.deadline)}
                    </span>
                    <span>•</span>
                    <span>Shipping: {formatCurrency(session.shipping_cost)} ({session.shipping_split_method})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Grand Total</div>
                    <div className="text-base font-extrabold text-orange-600">{formatCurrency(grandTotal)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShareSession(session)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                      title="Share Order Link & QR"
                    >
                      <Share2 className="w-4 h-4 text-orange-600" />
                    </button>
                    <Link
                      href={`/dashboard/orders/${session.id}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                    >
                      Manage Order <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share QR Dialog */}
      {shareSession && (
        <ShareQRDialog
          opened={Boolean(shareSession)}
          onClose={() => setShareSession(null)}
          orderName={shareSession.name}
          shareCode={shareSession.share_code}
        />
      )}
    </div>
  );
}
