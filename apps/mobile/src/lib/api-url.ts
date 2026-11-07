const API_PORT = 3000;

/**
 * Menentukan base URL API agar jalan di semua target tanpa edit kode:
 *  1. EXPO_PUBLIC_API_URL (jika diset) — selalu menang
 *  2. Web: host yang sama dengan halaman (localhost atau IP LAN) port 3000
 *  3. Expo Go di device: IP laptop yang dipakai Metro (dari hostUri) port 3000
 *  4. Emulator Android: 10.0.2.2 (alias host)
 *  5. Fallback: localhost
 */
export function resolveApiBaseUrl(opts: {
  envUrl?: string | null;
  platform: string;
  hostUri?: string | null;
  webHostname?: string | null;
}): string {
  const { envUrl, platform, hostUri, webHostname } = opts;

  if (envUrl && envUrl.trim()) {
    const base = envUrl.trim().replace(/\/+$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  if (platform === 'web') return `http://${webHostname || 'localhost'}:${API_PORT}/api`;

  const host = hostUri ? hostUri.split(':')[0] : '';
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${API_PORT}/api`;
  if (platform === 'android') return `http://10.0.2.2:${API_PORT}/api`;
  return `http://localhost:${API_PORT}/api`;
}
