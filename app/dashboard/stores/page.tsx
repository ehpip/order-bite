'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store as StoreIcon, PlusCircle, Search, Filter, Edit3, Trash2, ArrowRight } from 'lucide-react';
import { db } from '@/lib/storage/db-service';
import { Store } from '@/lib/types';

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    const list = await db.getStores();
    setStores(list);
  }

  async function handleDeleteStore(id: string, name: string) {
    if (confirm(`Are you sure you want to delete or archive store "${name}"?`)) {
      await db.deleteStore(id);
      loadStores();
    }
  }

  const filteredStores = stores.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Food Stores</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reusable restaurant and menu database for group food ordering sessions.
          </p>
        </div>
        <Link
          href="/dashboard/stores/new"
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Store
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores by name or description..."
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
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Stores List Grid */}
      {filteredStores.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No food stores match your search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className="relative h-32 bg-slate-100">
                {store.cover_image ? (
                  <img src={store.cover_image} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                    <StoreIcon className="w-8 h-8" />
                  </div>
                )}
                {store.logo && (
                  <div className="absolute -bottom-4 left-4 w-12 h-12 bg-white rounded-xl p-1 border border-slate-200 shadow-xs">
                    <img src={store.logo} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                )}
              </div>

              <div className="p-5 pt-7 space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 line-clamp-1">{store.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      store.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {store.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{store.description || 'No description provided.'}</p>
                {store.address && <p className="text-[11px] text-slate-400 line-clamp-1">📍 {store.address}</p>}
              </div>

              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/dashboard/stores/${store.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-2xs"
                >
                  Manage Menu <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => handleDeleteStore(store.id, store.name)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Store"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
