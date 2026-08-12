import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return "?";
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-sky-100 text-sky-700 border-sky-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "bg-lime-100 text-lime-700 border-lime-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

export function getAvatarColor(name: string): string {
  if (!name || name.trim().length === 0) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
