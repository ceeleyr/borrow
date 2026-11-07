const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_LOAN_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, '0');

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Tanggal lokal perangkat dalam format YYYY-MM-DD. */
export function todayString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** '2026-11-03' -> '3 Nov 2026' */
export function formatDate(date: string | null | undefined): string {
  if (!date || !isValidDateString(date.slice(0, 10))) return '-';
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** ISO timestamp -> '3 Nov 2026, 14:05' (waktu lokal) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '-';
  return `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}, ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

/** Pesan error (atau null bila valid) untuk pasangan tanggal pinjam & kembali. */
export function validateLoanDates(borrowDate: string, dueDate: string, today: string): string | null {
  if (!isValidDateString(borrowDate)) return 'Tanggal pinjam harus format YYYY-MM-DD';
  if (!isValidDateString(dueDate)) return 'Tanggal kembali harus format YYYY-MM-DD';
  if (borrowDate < today) return 'Tanggal pinjam tidak boleh di masa lalu';
  if (dueDate < borrowDate) return 'Tanggal kembali tidak boleh sebelum tanggal pinjam';
  if (diffDays(borrowDate, dueDate) > MAX_LOAN_DAYS) return `Durasi pinjam maksimal ${MAX_LOAN_DAYS} hari`;
  return null;
}
