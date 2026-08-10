'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileSpreadsheet, Tag, Trash2, Edit2, Check, X, Search, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/storage/db-service';
import { Store, StoreCategory, StoreItem } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import ImportMenuModal from '@/components/import-menu-modal';
import { useAuth } from '@/lib/auth-context';

export default function StoreDetailPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const { user, isAdmin, loginWithGoogle } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [editingItem, setEditingItem] = useState<Partial<StoreItem> | null>(null);

  useEffect(() => {
    loadData();
  }, [storeId]);

  async function loadData() {
    const s = await db.getStoreById(storeId);
    setStore(s);

    const cats = await db.getCategories(storeId);
    setCategories(cats);

    const itms = await db.getItems(storeId);
    setItems(itms);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      alert(`Only authorized administrators can add categories.`);
      loginWithGoogle();
      return;
    }
    if (!newCatName.trim()) return;
    await db.saveCategory(storeId, newCatName.trim());
    setNewCatName('');
    setCatModalOpen(false);
    loadData();
  }

  async function handleDeleteCategory(catId: string, name: string) {
    if (!isAdmin) {
      alert(`Only authorized administrators can delete categories.`);
      loginWithGoogle();
      return;
    }
    if (confirm(`Delete category "${name}"? Items under this category will become general.`)) {
      await db.deleteCategory(catId);
      if (selectedCatId === catId) setSelectedCatId('all');
      loadData();
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      alert(`Only authorized administrators can save menu items.`);
      loginWithGoogle();
      return;
    }
    if (!editingItem || !editingItem.name || !editingItem.price) return;

    await db.saveItem({
      ...editingItem,
      store_id: storeId,
      name: editingItem.name,
      price: Number(editingItem.price),
    });

    setEditingItem(null);
    setItemModalOpen(false);
    loadData();
  }

  async function handleToggleAvailability(item: StoreItem) {
    if (!isAdmin) {
      alert(`Only authorized administrators can toggle item availability.`);
      loginWithGoogle();
      return;
    }
    await db.saveItem({
      ...item,
      is_available: !item.is_available,
    });
    loadData();
  }

  async function handleDeleteItem(itemId: string, name: string) {
    if (!isAdmin) {
      alert(`Only authorized administrators can delete menu items.`);
      loginWithGoogle();
      return;
    }
    if (confirm(`Delete menu item "${name}"?`)) {
      await db.deleteItem(itemId);
      loadData();
    }
  }

  if (!store) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        Loading store details...
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCatId === 'all' || item.category_id === selectedCatId;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Admin Status Banner (shown only when signed in as Admin) */}
      {isAdmin && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Authenticated as <strong>{user?.email}</strong> (Store Admin)</span>
          </div>
          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            Editing Enabled
          </span>
        </div>
      )}

      {/* Header Back Link & Action buttons */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/stores"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Stores
        </Link>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Import JSON / CSV
            </button>
            <button
              onClick={() => {
                setEditingItem({ is_available: true, price: 0 });
                setItemModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          </div>
        )}
      </div>


      {/* Store Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="relative h-36 bg-slate-200">
          {store.cover_image && <img src={store.cover_image} alt={store.name} className="w-full h-full object-cover" />}
          {store.logo && (
            <div className="absolute -bottom-5 left-6 w-16 h-16 bg-white rounded-2xl p-1 border border-slate-200 shadow-md">
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover rounded-xl" />
            </div>
          )}
        </div>

        <div className="p-6 pt-8 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{store.name}</h1>
              <p className="text-xs sm:text-sm text-slate-500">{store.description || 'No description'}</p>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800">
              {store.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
            {store.address && <span>📍 {store.address}</span>}
            {store.phone && <span>📞 {store.phone}</span>}
            <span>🍔 {items.length} Menu Items</span>
          </div>
        </div>
      </div>

      {/* Categories & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCatId('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCatId === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat) => {
              const catCount = items.filter((i) => i.category_id === cat.id).length;
              const active = selectedCatId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    active ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat.name} ({catCount})
                </button>
              );
            })}
            {isAdmin ? (
              <button
                onClick={() => setCatModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors shrink-0 cursor-pointer"
              >
                + Category
              </button>
            ) : null}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs sm:text-sm">
          No menu items found in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const catName = categories.find((c) => c.id === item.category_id)?.name || 'General';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs flex flex-col justify-between space-y-3 transition-all ${
                  item.is_available ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="flex gap-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{item.name}</h3>
                      <span className="text-xs font-extrabold text-orange-600 shrink-0">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                      {catName}
                    </span>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.description || 'No description'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    disabled={!isAdmin}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                      item.is_available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    } ${isAdmin ? 'hover:bg-emerald-200 cursor-pointer' : 'opacity-80 cursor-default'}`}
                  >
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setItemModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <button
              onClick={() => setCatModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-slate-900 text-base">Add Menu Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Burgers, Drinks, Desserts, Snacks"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Item Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setItemModalOpen(false);
                setEditingItem(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base">
              {editingItem?.id ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editingItem?.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Big Mac, French Fries, Iced Latte"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={editingItem?.price || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    placeholder="45000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingItem?.category_id || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, category_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white outline-hidden"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingItem?.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  placeholder="Item ingredients or description..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={editingItem?.image || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_avail"
                  checked={editingItem?.is_available !== false}
                  onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <label htmlFor="is_avail" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Item is currently available for ordering
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setItemModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700"
                >
                  Save Menu Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportMenuModal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        storeId={storeId}
        storeName={store.name}
        onImportSuccess={() => loadData()}
      />
    </div>
  );
}
