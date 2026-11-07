import axios from 'axios';
import type { AxiosInstance } from 'axios';

export type HttpOptions = {
  baseURL: string;
  getToken: () => string | null;
  /** Dipanggil saat server menjawab 401 pada request yang membawa token (sesi habis). */
  onUnauthorized?: () => void;
  timeout?: number;
  adapter?: unknown; // untuk test
};

export function createHttpClient(opts: HttpOptions): AxiosInstance {
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
    (error) => {
      const hadToken = Boolean(error?.config?.headers?.get?.('Authorization'));
      if (error?.response?.status === 401 && hadToken) opts.onUnauthorized?.();
      return Promise.reject(error);
    }
  );

  return client;
}
