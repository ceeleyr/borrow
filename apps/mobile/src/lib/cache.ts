/**
 * Cache data lokal (persistence di device) untuk menampilkan data terakhir saat offline / server gagal.
 * Dibuat generik lewat "storage" yang di-inject: di aplikasi memakai AsyncStorage (lib/storage.ts),
 * di test memakai Map sederhana sehingga bisa diuji tanpa modul React Native.
 */
export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<readonly string[]>;
};

export type CachedValue<T> = { savedAt: number; value: T };

const PREFIX = 'cache:v1:';

export function createCache(storage: KeyValueStorage) {
  return {
    /** Mengembalikan null bila belum ada atau data rusak (tidak pernah melempar error). */
    async get<T>(key: string): Promise<CachedValue<T> | null> {
      try {
        const raw = await storage.getItem(PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CachedValue<T>;
        return typeof parsed?.savedAt === 'number' ? parsed : null;
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T, now: number = Date.now()): Promise<void> {
      try {
        const entry: CachedValue<T> = { savedAt: now, value };
        await storage.setItem(PREFIX + key, JSON.stringify(entry));
      } catch {
        // Cache hanya optimasi: kegagalan tulis tidak boleh menggagalkan aksi pengguna.
      }
    },

    /** Hapus semua cache aplikasi (dipanggil saat logout agar data pengguna tidak tertinggal). */
    async clear(): Promise<void> {
      try {
        const keys = (await storage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
        await Promise.all(keys.map((k) => storage.removeItem(k)));
      } catch {
        // abaikan
      }
    },
  };
}

export type Cache = ReturnType<typeof createCache>;
