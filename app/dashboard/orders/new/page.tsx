"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Store as StoreIcon,
  Clock,
  DollarSign,
  CreditCard,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/storage/db-service";
import { Store, ShippingSplitMethod } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function NewOrderSessionPage() {
  const router = useRouter();
  const { user, hostIdentifier, isAuthenticated } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [orderName, setOrderName] = useState("Friday Office Lunch 🍔");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [isCustomStore, setIsCustomStore] = useState(false);

  // Custom Store State
  const [customStoreName, setCustomStoreName] = useState("");
  const [customItems, setCustomItems] = useState<
    { name: string; price: number; description: string }[]
  >([{ name: "", price: 0, description: "" }]);

  // Session Settings
  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(45); // default 45 mins
  const [shippingCost, setShippingCost] = useState<number>(20000);
  const [shippingSplitMethod, setShippingSplitMethod] =
    useState<ShippingSplitMethod>("equal");
  const [paymentNotes, setPaymentNotes] = useState(
    "Transfer to BCA 1234567890 a.n. Host or GoPay 0812345678",
  );
  const [hostName, setHostName] = useState("Host");

  useEffect(() => {
    if (user?.name) {
      setHostName(user.name);
    } else if (user?.email) {
      setHostName(user.email.split("@")[0]);
    }
  }, [user]);

  useEffect(() => {
    async function fetchStores() {
      const list = await db.getStores();
      setStores(list);
      if (list.length > 0) {
        setSelectedStoreId(list[0].id);
      }
    }
    fetchStores();
  }, []);

  const handleAddCustomItem = () => {
    setCustomItems([...customItems, { name: "", price: 0, description: "" }]);
  };

  const handleRemoveCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const handleCustomItemChange = (index: number, field: string, value: any) => {
    const updated = [...customItems];
    updated[index] = { ...updated[index], [field]: value };
    setCustomItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return;

    try {
      setLoading(true);
      let snapshotId = "";

      if (isCustomStore) {
        if (!customStoreName.trim()) {
          alert("Please enter a custom store name.");
          setLoading(false);
          return;
        }
        const validCustomItems = customItems.filter(
          (i) => i.name.trim() && i.price > 0,
        );
        if (validCustomItems.length === 0) {
          alert("Please add at least one valid custom menu item with a price.");
          setLoading(false);
          return;
        }
        const snapRes = await db.createCustomSnapshot(
          customStoreName,
          validCustomItems,
        );
        snapshotId = snapRes.snapshot.id;
      } else {
        if (!selectedStoreId) {
          alert("Please select a store.");
          setLoading(false);
          return;
        }
        // Create Menu Snapshot from existing store
        const snapRes = await db.createSnapshotFromStore(selectedStoreId);
        snapshotId = snapRes.snapshot.id;
      }

      // Calculate deadline ISO string
      const deadlineISO = new Date(
        Date.now() + deadlineMinutes * 60 * 1000,
      ).toISOString();

      // Create Session
      const session = await db.createSession({
        name: orderName,
        store_id: isCustomStore ? undefined : selectedStoreId,
        snapshot_id: snapshotId,
        deadline: deadlineISO,
        shipping_cost: Number(shippingCost) || 0,
        shipping_split_method: shippingSplitMethod,
        payment_notes: paymentNotes,
        host_name: hostName,
        host_id: isAuthenticated ? user?.id : undefined,
        host_identifier: hostIdentifier,
      });

      // Redirect directly to host management dashboard with share popup trigger
      router.push(`/dashboard/orders/${session.id}?share=true`);
    } catch (err) {
      console.error("Failed to create session", err);
      alert("Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/orders"
          className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Create Group Order Session
          </h1>
          <p className="text-xs text-slate-500">
            Set store, deadline, shipping cost, and generate a shareable order
            link.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6"
      >
        {/* Step 1: Session & Host Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
            1. Group Order Info
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Group Order Name *
              </label>
              <input
                type="text"
                required
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                placeholder="e.g. Friday Office Lunch 🍔"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Your Name (Host)
              </label>
              <input
                type="text"
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Store Selection */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-orange-600">
              2. Select Food Store
            </h2>
            <button
              type="button"
              onClick={() => setIsCustomStore(!isCustomStore)}
              className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
            >
              {isCustomStore
                ? "← Select Existing Store"
                : "+ Create Custom Store & Menu"}
            </button>
          </div>

          {!isCustomStore ? (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Choose Store Database
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    onClick={() => setSelectedStoreId(store.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      selectedStoreId === store.id
                        ? "border-orange-600 bg-orange-50/60 ring-2 ring-orange-600/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                        {store.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate">
                        {store.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {store.description || "Pre-loaded Menu"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Custom Store Name *
                </label>
                <input
                  type="text"
                  value={customStoreName}
                  onChange={(e) => setCustomStoreName(e.target.value)}
                  placeholder="e.g. Local Nasi Goreng Stall"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-hidden focus:border-orange-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Custom Menu Items
                  </label>

                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {customItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="w-full bg-white p-3 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-start gap-2">
                        {/* Inputs */}
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2">
                          {/* Item Name */}
                          <input
                            type="text"
                            placeholder="Item Name"
                            value={item.name}
                            onChange={(e) =>
                              handleCustomItemChange(
                                idx,
                                "name",
                                e.target.value,
                              )
                            }
                            className="w-full min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-hidden focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20"
                          />

                          {/* Price */}
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                              Rp
                            </span>

                            <input
                              type="number"
                              placeholder="Price"
                              value={item.price || ""}
                              onChange={(e) =>
                                handleCustomItemChange(
                                  idx,
                                  "price",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full px-3 py-2 pl-9 text-xs border border-slate-200 rounded-lg outline-hidden focus:border-orange-600 focus:ring-1 focus:ring-orange-600/20"
                            />
                          </div>
                        </div>

                        {/* Delete */}
                        {customItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(idx)}
                            aria-label={`Remove item ${idx + 1}`}
                            className="shrink-0 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Session Deadline & Shipping */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-orange-600">
            3. Order Deadline & Shipping Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Ordering Closes In
              </label>
              <select
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-hidden focus:border-orange-600 font-medium"
              >
                <option value={15}>⏱ 15 Minutes</option>
                <option value={30}>⏱ 30 Minutes</option>
                <option value={45}>⏱ 45 Minutes (Recommended)</option>
                <option value={60}>⏱ 1 Hour</option>
                <option value={120}>⏱ 2 Hours</option>
                <option value={240}>⏱ 4 Hours</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Total Shipping Cost (Rp)
              </label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                placeholder="20000"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Shipping Cost Allocation
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                  shippingSplitMethod === "equal"
                    ? "border-orange-600 bg-orange-50/60 font-bold text-orange-900"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="split"
                    checked={shippingSplitMethod === "equal"}
                    onChange={() => setShippingSplitMethod("equal")}
                    className="text-orange-600"
                  />
                  <span>Split Equally</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-1">
                  Divided evenly among members
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                  shippingSplitMethod === "proportional"
                    ? "border-orange-600 bg-orange-50/60 font-bold text-orange-900"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="split"
                    checked={shippingSplitMethod === "proportional"}
                    onChange={() => setShippingSplitMethod("proportional")}
                    className="text-orange-600"
                  />
                  <span>Proportional</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-1">
                  Based on member food total
                </span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer text-xs flex flex-col justify-between ${
                  shippingSplitMethod === "host"
                    ? "border-orange-600 bg-orange-50/60 font-bold text-orange-900"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="split"
                    checked={shippingSplitMethod === "host"}
                    onChange={() => setShippingSplitMethod("host")}
                    className="text-orange-600"
                  />
                  <span>Host Pays</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal mt-1">
                  Members pay only for food
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Step 4: Payment Instructions */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800">
            Payment Transfer Notes / Bank Account
          </label>
          <input
            type="text"
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            placeholder="e.g. BCA 123456789 a.n. Sarah or GoPay 0812345678"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-hidden focus:border-orange-600"
          />
          <p className="text-[11px] text-slate-500">
            This will be shown to members so they know where to pay you.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <Link
            href="/dashboard/orders"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {loading ? "Creating Session..." : "Create Order & Get Link"}
          </button>
        </div>
      </form>
    </div>
  );
}
