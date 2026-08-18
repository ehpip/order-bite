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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shrink-0 tabular-nums">
        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        Ordering Closed
      </span>
    );
  }

  // Visual urgency based on remaining time
  const totalSec = remaining.totalSeconds;
  let colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let icon = <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />;

  if (totalSec <= 300) {
    // Under 5 minutes -> Urgent Red
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 animate-bounce-subtle';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
  } else if (totalSec <= 900) {
    // Under 15 minutes -> Warning Amber
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    icon = <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 tabular-nums min-w-[8.25rem] justify-center ${colorClasses}`}
    >
      {icon}
      <span>Closes in {remaining.formatted}</span>
    </span>
  );
}
