/**
 * Formats integer monetary values into Indonesian Rupiah (Rp XX.XXX) or general format.
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Formats date into readable localized string
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats time remaining in hours, minutes, seconds until a deadline
 */
export function formatTimeRemaining(deadlineISO: string): {
  formatted: string;
  isExpired: boolean;
  totalSeconds: number;
} {
  const deadline = new Date(deadlineISO).getTime();
  const now = new Date().getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return { formatted: 'Deadline passed', isExpired: true, totalSeconds: 0 };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor(diff / (1000 * 60 * 60));

  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${seconds}s`;

  return {
    formatted: result.trim(),
    isExpired: false,
    totalSeconds: Math.floor(diff / 1000),
  };
}

/**
 * Generates a random alphanumeric share code (e.g. "a8F92k")
 */
export function generateShareCode(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
