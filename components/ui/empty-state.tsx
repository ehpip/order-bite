'use client';

import React from 'react';
import { LucideIcon, ShoppingBag } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon = ShoppingBag,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-lg mx-auto my-6">
      <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mx-auto mb-4 border border-orange-100">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">{description}</p>
      {actionLabel && (
        <div>
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
            >
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
