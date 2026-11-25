import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getErrorMessage } from '@/lib/errors';
import { appCache } from '@/lib/storage';

type LoadOptions = {
  /**
   * Bila diisi, hasil sukses disimpan di device. Saat request gagal dan belum ada data di layar,
   * data terakhir dari cache ditampilkan (fromCache = true) sambil tetap menampilkan error.
   */
  cacheKey?: string | null;
};

/** Ambil data saat layar fokus (otomatis segar setelah kembali dari layar lain) + pull-to-refresh. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = [], options: LoadOptions = {}) {
  const { cacheKey = null } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const alive = useRef(true);
  const hasData = useRef(false);
  // Kunci cache dibaca lewat ref agar dependency useCallback tetap array literal.
  // Caller sudah memasukkan nilai yang menentukan kunci (mis. filter) ke `deps`.
  const cacheKeyRef = useRef(cacheKey);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    cacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (manual: boolean) => {
    if (manual) setRefreshing(true);
    else if (!hasData.current) setLoading(true);
    try {
      const result = await fetcher();
      if (!alive.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
      setFromCache(false);
      setSavedAt(null);
      const key = cacheKeyRef.current;
      if (key) void appCache.set(key, result);
    } catch (e) {
      if (!alive.current) return;
      setError(getErrorMessage(e, 'Gagal memuat data'));
      const key = cacheKeyRef.current;
      if (key && !hasData.current) {
        const cached = await appCache.get<T>(key);
        if (!alive.current) return;
        if (cached) {
          hasData.current = true;
          setData(cached.value);
          setFromCache(true);
          setSavedAt(cached.savedAt);
        }
      }
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, deps);

  useFocusEffect(
    useCallback(() => {
      void run(false);
    }, [run])
  );

  return {
    data,
    loading,
    refreshing,
    error,
    fromCache,
    savedAt,
    reload: () => run(true),
    setData,
  };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
