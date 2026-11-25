import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { BorrowRequest } from '@/services/types';
import { needsReturnReminder, reminderDate } from './reminder';

/**
 * Notifikasi lokal: pengingat pengembalian barang (H-1 tanggal kembali).
 * Dijadwalkan di perangkat, jadi tetap berbunyi walau aplikasi ditutup. Web tidak didukung (no-op).
 */
const REMINDER_PREFIX = 'return-reminder:';
const isNative = Platform.OS !== 'web';

/** Atur agar notifikasi tampil banner saat aplikasi sedang dibuka. Dipanggil sekali saat app start. */
export function setupNotifications() {
  if (!isNative) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Minta izin notifikasi. Mengembalikan true bila diizinkan. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Sinkronkan pengingat dengan daftar pinjaman pengguna: jadwalkan untuk yang masih dipegang,
 * batalkan untuk sisanya. Identifier stabil (per request) sehingga jadwal tidak dobel.
 */
export async function syncReturnReminders(requests: BorrowRequest[]): Promise<void> {
  if (!isNative) return;
  try {
    if (!(await ensureNotificationPermission())) return;
    const now = new Date();
    for (const r of requests) {
      const identifier = REMINDER_PREFIX + r.id;
      const when = needsReturnReminder(r.status) ? reminderDate(r.due_date, now) : null;
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
      if (!when) continue;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: 'Pengingat pengembalian',
          body: `${r.item?.name ?? 'Barang'} harus dikembalikan besok (${r.due_date}).`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  } catch {
    // Notifikasi hanya pelengkap: kegagalan tidak boleh mengganggu layar.
  }
}

/** Batalkan semua pengingat terjadwal (dipanggil saat logout agar tidak mengganggu akun lain). */
export async function clearReturnReminders(): Promise<void> {
  if (!isNative) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // abaikan
  }
}
