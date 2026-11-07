type MaybeAxiosError = {
  code?: string;
  message?: string;
  response?: { data?: { message?: string } };
  request?: unknown;
};

/** Ubah error axios/umum menjadi pesan yang ramah untuk pengguna. */
export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
  const e = (error ?? {}) as MaybeAxiosError;
  const serverMessage = e.response?.data?.message;
  if (serverMessage) return serverMessage;
  if (e.code === 'ECONNABORTED') return 'Server tidak merespons (timeout). Coba lagi.';
  if (e.code === 'ERR_NETWORK' || e.message === 'Network Error' || (e.request && !e.response)) {
    return 'Tidak bisa terhubung ke server. Pastikan API berjalan dan satu jaringan dengan perangkat.';
  }
  return fallback;
}
