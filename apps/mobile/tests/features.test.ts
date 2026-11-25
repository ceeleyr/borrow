import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createCache } from '../src/lib/cache.ts';
import type { KeyValueStorage } from '../src/lib/cache.ts';
import { needsReturnReminder, reminderDate, REMINDER_HOUR } from '../src/lib/reminder.ts';
import { validateProfileForm } from '../src/lib/validation.ts';
import { isNetworkError } from '../src/lib/errors.ts';
import { createHttpClient, isRetryable } from '../src/services/http.ts';

/** Penyimpanan palsu berbasis Map, meniru AsyncStorage. */
function memoryStorage(): KeyValueStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    async getItem(key) {
      return map.get(key) ?? null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
    async getAllKeys() {
      return [...map.keys()];
    },
  };
}

test('cache: simpan lalu baca kembali, dengan waktu simpan', async () => {
  const cache = createCache(memoryStorage());
  await cache.set('items', [{ id: 1 }], 1000);
  const hit = await cache.get<{ id: number }[]>('items');
  assert.deepEqual(hit, { savedAt: 1000, value: [{ id: 1 }] });
  assert.equal(await cache.get('tidak-ada'), null);
});

test('cache: data rusak tidak melempar error, dianggap kosong', async () => {
  const storage = memoryStorage();
  storage.map.set('cache:v1:items', '{rusak');
  const cache = createCache(storage);
  assert.equal(await cache.get('items'), null);
});

test('cache: clear hanya menghapus kunci milik aplikasi', async () => {
  const storage = memoryStorage();
  const cache = createCache(storage);
  await cache.set('items', 'a');
  await cache.set('requests:mine:all', 'b');
  storage.map.set('access_token_lain', 'jangan dihapus');
  await cache.clear();
  assert.deepEqual([...storage.map.keys()], ['access_token_lain']);
});

test('reminder: H-1 tanggal kembali pukul 09.00 waktu lokal', () => {
  const now = new Date(2026, 10, 1, 8, 0);
  const at = reminderDate('2026-12-10', now);
  assert.ok(at);
  assert.equal(at.getFullYear(), 2026);
  assert.equal(at.getMonth(), 11);
  assert.equal(at.getDate(), 9);
  assert.equal(at.getHours(), REMINDER_HOUR);
});

test('reminder: null bila waktu pengingat sudah lewat atau tanggal tidak valid', () => {
  const now = new Date(2026, 10, 20, 10, 0);
  assert.equal(reminderDate('2026-11-21', now), null); // pengingat 20 Nov 09.00 sudah lewat
  assert.equal(reminderDate('bukan-tanggal', now), null);
  assert.ok(reminderDate('2026-11-22', now)); // pengingat 21 Nov 09.00 masih di masa depan
});

test('reminder: hanya pinjaman yang masih dipegang peminjam', () => {
  assert.equal(needsReturnReminder('approved'), true);
  assert.equal(needsReturnReminder('borrowed'), true);
  assert.equal(needsReturnReminder('pending'), false);
  assert.equal(needsReturnReminder('returned'), false);
});

test('isNetworkError: hanya true bila belum ada jawaban dari server', () => {
  assert.equal(isNetworkError({ code: 'ERR_NETWORK' }), true);
  assert.equal(isNetworkError({ code: 'ECONNABORTED' }), true);
  assert.equal(isNetworkError({ request: {} }), true);
  assert.equal(isNetworkError({ response: { status: 409 }, request: {} }), false);
  assert.equal(isNetworkError(new Error('lain')), false);
});

test('validateProfileForm: nama wajib dan maksimal 100 karakter', () => {
  assert.equal(validateProfileForm({ fullName: '   ' }).fullName, 'Nama tidak boleh kosong');
  assert.equal(validateProfileForm({ fullName: 'a'.repeat(101) }).fullName, 'Nama maksimal 100 karakter');
  assert.deepEqual(validateProfileForm({ fullName: '  Budi  ' }), {});
});

/** Adapter palsu: setiap panggilan mengikuti daftar hasil berikutnya (sukses, status, atau error jaringan). */
function scriptedAdapter(script: Array<{ status: number } | 'network'>) {
  let calls = 0;
  const adapter = async (config: any) => {
    const step = script[Math.min(calls, script.length - 1)];
    calls++;
    if (step === 'network') {
      throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config, null);
    }
    const response = { data: { success: step.status < 400, data: { ok: true } }, status: step.status, statusText: '', headers: {}, config };
    if (step.status >= 400) throw new axios.AxiosError('err', 'ERR_BAD_REQUEST', config, null, response as any);
    return response;
  };
  return { adapter, calls: () => calls };
}

function client(adapter: unknown, extra: { retries?: number; onUnauthorized?: () => void } = {}) {
  return createHttpClient({
    baseURL: 'http://x/api',
    getToken: () => 'tok',
    retryDelayMs: 0,
    adapter,
    ...extra,
  });
}

test('retry: GET yang gagal jaringan lalu berhasil diulang otomatis', async () => {
  const s = scriptedAdapter(['network', 'network', { status: 200 }]);
  const res = await client(s.adapter).get('/items');
  assert.equal(res.status, 200);
  assert.equal(s.calls(), 3); // percobaan awal + 2 retry
});

test('retry: GET 5xx diulang, lalu menyerah setelah batas', async () => {
  const s = scriptedAdapter([{ status: 503 }]);
  await assert.rejects(client(s.adapter).get('/items'));
  assert.equal(s.calls(), 3);
});

test('retry: 4xx dan request tulis (POST) tidak diulang', async () => {
  const notFound = scriptedAdapter([{ status: 404 }]);
  await assert.rejects(client(notFound.adapter).get('/items/x'));
  assert.equal(notFound.calls(), 1);

  const post = scriptedAdapter(['network']);
  await assert.rejects(client(post.adapter).post('/borrow', {}));
  assert.equal(post.calls(), 1);
});

test('isRetryable: jaringan putus dan 5xx ya, 4xx tidak', () => {
  const err = (status?: number, method = 'get') =>
    ({ config: { method }, response: status ? { status } : undefined }) as any;
  assert.equal(isRetryable(err(undefined)), true);
  assert.equal(isRetryable(err(500)), true);
  assert.equal(isRetryable(err(401)), false);
  assert.equal(isRetryable(err(500, 'post')), false);
});
