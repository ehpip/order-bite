'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Lock } from 'lucide-react';
import { formatTimeRemaining } from '@/lib/formatters';

interface CountdownBadgeProps {
  deadlineISO: string;
  isClosed?: boolean;
}

export default function CountdownBadge({ deadlineISO, isClosed }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState(() => formatTimeRemaining(deadlineISO));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(formatTimeRemaining(deadlineISO));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadlineISO]);

  if (isClosed || remaining.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <Lock className="w-3.5 h-3.5 text-slate-500" />
        Ordering Closed
      </span>
    );
  }

  // Visual urgency based on remaining time
  const totalSec = remaining.totalSeconds;
  let colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let icon = <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />;

  if (totalSec <= 300) {
    // Under 5 minutes -> Urgent Red
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 animate-bounce-subtle';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
  } else if (totalSec <= 900) {
    // Under 15 minutes -> Warning Amber
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      {icon}
      <span>Closes in {remaining.formatted}</span>
    </span>
  );
}
