import { isValidDateString } from './dates.ts';
import type { BorrowStatus } from './status.ts';

/** Pengingat dikirim H-1 tanggal kembali, pukul 09.00 waktu lokal perangkat. */
export const REMINDER_HOUR = 9;

/** Status yang barangnya masih dipegang peminjam (perlu diingatkan untuk dikembalikan). */
export function needsReturnReminder(status: BorrowStatus): boolean {
  return status === 'approved' || status === 'borrowed';
}

/**
 * Waktu pengingat untuk tanggal kembali (YYYY-MM-DD).
 * Mengembalikan null bila tanggal tidak valid atau waktu pengingat sudah lewat.
 */
export function reminderDate(dueDate: string, now: Date = new Date()): Date | null {
  if (!isValidDateString(dueDate)) return null;
  const [year, month, day] = dueDate.split('-').map(Number);
  const at = new Date(year, month - 1, day - 1, REMINDER_HOUR, 0, 0);
  return at.getTime() > now.getTime() ? at : null;
}
