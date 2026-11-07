import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getErrorMessage } from '@/lib/errors';

/** Ambil data saat layar fokus (otomatis segar setelah kembali dari layar lain) + pull-to-refresh. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const hasData = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
    } catch (e) {
      if (alive.current) setError(getErrorMessage(e, 'Gagal memuat data'));
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

  return { data, loading, refreshing, error, reload: () => run(true), setData };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
