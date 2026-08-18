"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  FileText,
  ShoppingBag,
  CreditCard,
  Bell,
} from "lucide-react";
import { OrderSession, MemberOrder } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatShippingCost,
} from "@/lib/formatters";

interface CopySummaryMenuProps {
  session: OrderSession;
  orders: MemberOrder[];
  storeName?: string;
}

export default function CopySummaryMenu({
  session,
  orders,
  storeName,
}: CopySummaryMenuProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const triggerCopy = (type: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 1. Restaurant Summary
  const generateRestaurantSummary = () => {
    const itemMap = new Map<string, number>();
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.item_name;
        itemMap.set(key, (itemMap.get(key) || 0) + item.quantity);
      });
    });

    let totalFood = 0;
    orders.forEach((o) => (totalFood += o.food_subtotal));
    const grandTotal = totalFood + session.shipping_cost;

    let text = `🍔 *${session.name.toUpperCase()}* — ${storeName || "Restaurant"}\n`;
    if (session.description) {
      text += `📝 ${session.description}\n`;
    }
    text += `──────────────\n`;
    itemMap.forEach((qty, itemName) => {
      text += `• ${itemName} × ${qty}\n`;
    });
    text += `──────────────\n`;
    text += `👥 Members: ${orders.length} people\n`;
    text += `🍲 Food Total: ${formatCurrency(totalFood)}\n`;
    text += `🛵 Shipping: ${formatShippingCost(session.shipping_cost)}\n`;
    text += `💰 *Grand Total: ${formatCurrency(grandTotal)}*\n`;

    return text;
  };

  // 2. Member Breakdown
  const generateMemberSummary = () => {
    let text = `📋 *${session.name} — Member Orders*\n`;
    if (session.description) {
      text += `📝 ${session.description}\n`;
    }
    text += `──────────────\n`;
    orders.forEach((o) => {
      text += `*${o.member_name}* (${formatCurrency(o.grand_total)}):\n`;
      o.items.forEach((item) => {
        text += `  - ${item.item_name} ×${item.quantity}${item.notes ? ` (${item.notes})` : ""}\n`;
      });
      text += `\n`;
    });
    return text;
  };

  // 3. Payment Status Summary
  const generatePaymentSummary = () => {
    let paidTotal = 0;
    let unpaidTotal = 0;

    let text = `💳 *Payment Status — ${session.name}*\n`;
    if (session.payment_notes) {
      text += `📌 ${session.payment_notes}\n`;
    }
    text += `──────────────\n`;

    orders.forEach((o) => {
      const isPaid = o.payment_status === "paid";
      const isReported = o.payment_status === "payment_reported";
      const icon = isPaid ? "✅" : isReported ? "⏳" : "❌";
      const statusLabel = isPaid ? "PAID" : isReported ? "Reported" : "UNPAID";

      text += `${icon} *${o.member_name}*: ${formatCurrency(o.grand_total)} (${statusLabel})\n`;

      if (isPaid) paidTotal += o.grand_total;
      else unpaidTotal += o.grand_total;
    });

    text += `──────────────\n`;
    text += `Paid: ${formatCurrency(paidTotal)}\n`;
    text += `Unpaid: ${formatCurrency(unpaidTotal)}\n`;

    return text;
  };

  // 4. Unpaid Reminder
  const generateUnpaidReminder = () => {
    const unpaidMembers = orders.filter((o) => o.payment_status !== "paid");
    if (unpaidMembers.length === 0) return "All members have paid! 🎉";

    let text = `🔔 *Payment Reminder — ${session.name}*\n\n`;
    text += `Hi everyone! Friendly reminder to transfer payment to host for our food order:\n\n`;
    if (session.payment_notes) {
      text += `💳 ${session.payment_notes}\n\n`;
    }
    unpaidMembers.forEach((o) => {
      text += `• ${o.member_name}: ${formatCurrency(o.grand_total)}\n`;
    });
    text += `\nThank you! 🙏`;
    return text;
  };

  // 5. Order Deadline Reminder
  const generateDeadlineReminder = () => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/order/${session.share_code}`
        : `/order/${session.share_code}`;
    let text = `⏰ *Reminder: ${session.name}*\n\n`;
    if (session.description) {
      text += `📝 ${session.description}\n\n`;
    }
    text += `Ordering closes soon (${formatDate(session.deadline)}).\n\n`;
    text += `If you haven't placed your food order yet, click here to choose:\n${shareUrl}\n\n`;
    text += `Don't miss out! 🍔🍟`;
    return text;
  };

  const copyButtons = [
    {
      id: "restaurant",
      label: "Restaurant Summary",
      sublabel: "Aggregated item totals",
      icon: ShoppingBag,
      generator: generateRestaurantSummary,
    },
    {
      id: "member",
      label: "Detailed Member Orders",
      sublabel: "Items per person",
      icon: FileText,
      generator: generateMemberSummary,
    },
    {
      id: "payment",
      label: "Payment Status",
      sublabel: "Paid vs Unpaid totals",
      icon: CreditCard,
      generator: generatePaymentSummary,
    },
    {
      id: "unpaid_reminder",
      label: "Unpaid Reminder",
      sublabel: "Text for unpaid members",
      icon: Bell,
      generator: generateUnpaidReminder,
    },
    {
      id: "deadline_reminder",
      label: "Order Link Reminder",
      sublabel: "Text for pending orders",
      icon: Bell,
      generator: generateDeadlineReminder,
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <Copy className="w-4.5 h-4.5 text-orange-600" />
        WhatsApp Copy Summaries
      </h3>
      <p className="text-xs text-slate-500">
        Copy ready-to-send formatted text for WhatsApp groups, restaurant
        orders, or payment reminders.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
        {copyButtons.map((btn) => {
          const Icon = btn.icon;
          const isCopied = copiedType === btn.id;

          return (
            <button
              key={btn.id}
              onClick={() => triggerCopy(btn.id, btn.generator())}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isCopied
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-200 text-orange-600"
                }`}
              >
                {isCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold leading-snug">
                  {isCopied ? "Copied to Clipboard!" : btn.label}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {btn.sublabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
