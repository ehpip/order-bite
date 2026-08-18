"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  ListOrdered,
  Store as StoreIcon,
  Users,
  DollarSign,
  ArrowRight,
  Share2,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { db } from "@/lib/storage/db-service";
import { OrderSession, Store, MemberOrder } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatShippingCost,
} from "@/lib/formatters";
import CountdownBadge from "@/components/ui/countdown-badge";
import ShareQRDialog from "@/components/share-qr-dialog";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, hostIdentifier, isHostOwner, loginWithGoogle, isLoading } =
    useAuth();
  const [sessions, setSessions] = useState<OrderSession[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [allOrders, setAllOrders] = useState<MemberOrder[]>([]);
  const [selectedShareSession, setSelectedShareSession] =
    useState<OrderSession | null>(null);

  useEffect(() => {
    async function loadData() {
      // Fetch sessions for this host/device context
      const sessList = await db.getSessions(hostIdentifier);
      setSessions(sessList);

      const storeList = await db.getStores();
      setStores(storeList);

      let ordersList: MemberOrder[] = [];
      for (const s of sessList) {
        const sOrders = await db.getOrdersForSession(s.id);
        ordersList.push(...sOrders);
      }
      setAllOrders(ordersList);
    }
    if (!isLoading) {
      loadData();
    }
  }, [user, hostIdentifier, isLoading]);

  const activeSessionsCount = sessions.filter(
    (s) => s.status === "open",
  ).length;
  const unpaidOrdersCount = allOrders.filter(
    (o) => o.payment_status === "unpaid",
  ).length;
  const totalVolume = allOrders.reduce((sum, o) => sum + o.grand_total, 0);

  return (
    <div className="space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Host Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage stores, create group orders, and track member payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders/new"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Create Group Order
          </Link>
        </div>
      </div>

      {/* Unauthenticated Host Notice */}
      {!user && !isLoading && (
        <div className="bg-orange-50 border border-orange-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-orange-900 shadow-2xs">
          <div>
            <span className="font-bold block text-sm text-orange-950">
              Host Authentication Recommended
            </span>
            <span className="text-orange-800">
              Sign in with Google so your group order sessions are securely
              bound to your host account.
            </span>
          </div>
          <button
            onClick={() => loginWithGoogle()}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            <LogIn className="w-4 h-4" /> Sign In with Google
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">
              Active Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <ListOrdered className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {activeSessionsCount}
          </div>
          <p className="text-[11px] text-slate-500">
            Open sessions taking orders
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider font-semibold">
              Food Stores
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <StoreIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {stores.length}
          </div>
          <p className="text-[11px] text-slate-500">Reusable store menus</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider font-semibold">
              Unpaid Members
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {unpaidOrdersCount}
          </div>
          <p className="text-[11px] text-slate-500">Members owing payment</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider font-semibold">
              Total Volume
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalVolume)}
          </div>
          <p className="text-[11px] text-slate-500">
            Combined group food orders
          </p>
        </div>
      </div>

      {/* Active Group Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Group Order Sessions
            </h2>
            <p className="text-xs text-slate-500">
              Click manage to review orders, track payments, or copy summaries
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            All Sessions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No sessions created yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.slice(0, 5).map((session) => {
              const isOwner = isHostOwner(session);
              return (
                <div
                  key={session.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {session.name}
                      </span>
                      <CountdownBadge
                        deadlineISO={session.deadline}
                        isClosed={session.status === "closed"}
                      />
                    </div>
                    {session.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-2">
                        {session.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Deadline: {formatDate(session.deadline)}</span>
                      <span>•</span>
                      <span>
                        Shipping: {formatShippingCost(session.shipping_cost)} (
                        {session.shipping_split_method})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedShareSession(session)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-orange-600" />
                      Share Link
                    </button>
                    {isOwner && (
                      <Link
                        href={`/dashboard/orders/${session.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Manage Order
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Food Stores Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Food Stores Database
            </h2>
            <p className="text-xs text-slate-500">
              View available stores, menus, and item catalogs for group orders
            </p>
          </div>
          <Link
            href="/dashboard/stores"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            All Stores <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center gap-3">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="w-10 h-10 rounded-xl object-cover border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                    {store.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {store.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {store.address || "Standard Store"}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/stores/${store.id}`}
                className="block text-center text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 py-1.5 rounded-lg transition-colors border border-orange-200"
              >
                View Store Menu
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Share QR Dialog */}
      {selectedShareSession && (
        <ShareQRDialog
          opened={Boolean(selectedShareSession)}
          onClose={() => setSelectedShareSession(null)}
          orderName={selectedShareSession.name}
          shareCode={selectedShareSession.share_code}
        />
      )}
    </div>
  );
}
