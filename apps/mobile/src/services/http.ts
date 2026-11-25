import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

export type HttpOptions = {
  baseURL: string;
  getToken: () => string | null;
  /** Dipanggil saat server menjawab 401 pada request yang membawa token (sesi habis). */
  onUnauthorized?: () => void;
  timeout?: number;
  /** Jumlah percobaan ulang untuk GET yang gagal jaringan/timeout/5xx. Default 2. */
  retries?: number;
  /** Jeda dasar backoff (ms), digandakan tiap percobaan. Default 400. */
  retryDelayMs?: number;
  adapter?: unknown; // untuk test
};

type RetryableConfig = { method?: string; _retryCount?: number };

/** Hanya request baca (GET) yang aman diulang; POST/PUT/DELETE tidak di-retry agar tidak dobel. */
export function isRetryable(error: AxiosError): boolean {
  const method = (error.config?.method ?? 'get').toLowerCase();
  if (method !== 'get') return false;
  if (!error.response) return true; // jaringan putus / timeout
  return error.response.status >= 500;
}

export function createHttpClient(opts: HttpOptions): AxiosInstance {
  const maxRetries = opts.retries ?? 2;
  const baseDelay = opts.retryDelayMs ?? 400;

  const client = axios.create({
    baseURL: opts.baseURL,
    timeout: opts.timeout ?? 10000,
    ...(opts.adapter ? { adapter: opts.adapter as never } : {}),
  });

  client.interceptors.request.use((config) => {
    const token = opts.getToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const config = error?.config as (typeof error.config & RetryableConfig) | undefined;
      if (config && isRetryable(error)) {
        const attempt = config._retryCount ?? 0;
        if (attempt < maxRetries) {
          config._retryCount = attempt + 1;
          await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** attempt));
          return client.request(config);
        }
      }

      const hadToken = Boolean(error?.config?.headers?.get?.('Authorization'));
      if (error?.response?.status === 401 && hadToken) opts.onUnauthorized?.();
      return Promise.reject(error);
    }
  );

  return client;
}
