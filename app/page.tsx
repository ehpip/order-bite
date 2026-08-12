'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { Utensils, PlusCircle, Share2, Clock, CheckCircle2, ArrowRight, Store as StoreIcon, ShieldCheck, Users, DollarSign } from 'lucide-react';
import { db } from '@/lib/storage/db-service';
import { OrderSession, Store } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import CountdownBadge from '@/components/ui/countdown-badge';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { isHostOwner } = useAuth();
  const [activeSessions, setActiveSessions] = useState<OrderSession[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    async function loadData() {
      const allSessions = await db.getSessions();
      const openSessions = allSessions.filter((s) => s.status === 'open');
      setActiveSessions(openSessions);

      const allStores = await db.getStores();
      setStores(allStores.slice(0, 4));
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-orange-50/80 via-white to-slate-50 py-12 sm:py-20 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold tracking-wide uppercase shadow-2xs">
            <Utensils className="w-3.5 h-3.5 text-orange-600" />
            Fast & Free Group Food Ordering
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Order Food Together <br />
            <span className="text-orange-600">In Under 1 Minute</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Create a session, share one link with your team, let everyone pick their food, and easily track who has paid — no registration required for members!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/orders/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-base font-bold px-7 py-3.5 rounded-xl shadow-md transition-all hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              Create Group Order
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-base font-semibold px-6 py-3.5 rounded-xl shadow-xs transition-colors"
            >
              Go to Host Dashboard
            </Link>
          </div>

          {/* Quick steps banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-10 text-left border-t border-slate-200/80">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-sm mb-2">1</div>
              <div className="text-sm font-bold text-slate-900">Choose Store</div>
              <div className="text-xs text-slate-500 mt-1">Select TamrLatte, Point Coffee, Tuku, or custom restaurant</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-sm mb-2">2</div>
              <div className="text-sm font-bold text-slate-900">Share Link</div>
              <div className="text-xs text-slate-500 mt-1">Send unique link or QR code to WhatsApp group</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-sm mb-2">3</div>
              <div className="text-sm font-bold text-slate-900">Members Order</div>
              <div className="text-xs text-slate-500 mt-1">Members select food without logging in</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-sm mb-2">4</div>
              <div className="text-sm font-bold text-slate-900">Track Payments</div>
              <div className="text-xs text-slate-500 mt-1">Check paid vs unpaid and copy order summary</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Orders Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Active Group Orders</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Open sessions currently accepting member food choices
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            View All Orders <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {activeSessions.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <Utensils className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-slate-600 font-medium text-sm">No active group orders right now.</p>
            <Link
              href="/dashboard/orders/new"
              className="inline-flex items-center gap-2 bg-orange-600 text-white font-medium text-xs px-4 py-2 rounded-lg"
            >
              <PlusCircle className="w-4 h-4" /> Create First Order
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{session.name}</h3>
                    <CountdownBadge deadlineISO={session.deadline} />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Host: <span className="font-semibold text-slate-700">{session.host_name || 'Host'}</span>
                  </p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Shipping Fee:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(session.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Split Method:</span>
                      <span className="font-semibold capitalize text-slate-800">{session.shipping_split_method}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    href={`/order/${session.share_code}`}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs py-2.5 px-3 rounded-xl text-center transition-colors"
                  >
                    Join as Member
                  </Link>
                  {isHostOwner(session) && (
                    <Link
                      href={`/dashboard/orders/${session.id}`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs py-2.5 px-3 rounded-xl text-center transition-colors"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Stores Section */}
      <section className="bg-white border-t border-slate-200 py-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Featured Food Stores</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Pre-loaded store database with categories & menu items
              </p>
            </div>
            <Link
              href="/dashboard/stores"
              className="text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              View All Stores <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="relative h-28 bg-slate-200">
                  {store.cover_image && (
                    <img
                      src={store.cover_image}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {store.logo && (
                    <div className="absolute -bottom-4 left-4 w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs">
                      <img src={store.logo} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="p-4 pt-6 space-y-2 flex-1">
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{store.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{store.description}</p>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    href={`/dashboard/stores/${store.id}`}
                    className="block w-full bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs py-2 rounded-xl text-center border border-slate-200 transition-colors"
                  >
                    View Menu Items
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs text-center">
        <p>© 2026 OrderBite — Group Food Ordering Web App</p>
      </footer>
    </div>
  );
}
