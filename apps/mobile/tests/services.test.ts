import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createHttpClient } from '../src/services/http.ts';
import { createApiServices } from '../src/services/api.ts';

type Seen = { method?: string; url?: string; params?: unknown; data?: unknown; auth?: string | null };

/** Adapter palsu: mencatat request dan membalas sesuai handler (tanpa jaringan). */
function setup(handler: (seen: Seen) => { status?: number; data?: unknown } = () => ({ data: { success: true, data: {} } })) {
  const seen: Seen[] = [];
  let unauthorized = 0;
  let token: string | null = 'tok123';
  const adapter = async (config: any) => {
    const s: Seen = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data ? JSON.parse(config.data) : undefined,
      auth: config.headers.get('Authorization'),
    };
    seen.push(s);
    const { status = 200, data } = handler(s);
    const response = { data, status, statusText: '', headers: {}, config };
    if (status >= 400) throw new axios.AxiosError('err', 'ERR_BAD_REQUEST', config, null, response as any);
    return response;
  };
  const http = createHttpClient({ baseURL: 'http://x/api', getToken: () => token, onUnauthorized: () => void unauthorized++, adapter });
  return { api: createApiServices(http), seen, setToken: (t: string | null) => (token = t), unauthorizedCount: () => unauthorized };
}

test('menyertakan Bearer token bila ada, tanpa token bila tidak', async () => {
  const t = setup();
  await t.api.items.list();
  assert.equal(t.seen[0].auth, 'Bearer tok123');
  t.setToken(null);
  await t.api.items.list();
  assert.equal(t.seen[1].auth, undefined);
});

test('response di-unwrap dari {success,data}', async () => {
  const t = setup(() => ({ data: { success: true, data: [{ id: 'i1' }] } }));
  assert.deepEqual(await t.api.items.list(), [{ id: 'i1' }]);
});

test('param kosong tidak dikirim (search/status)', async () => {
  const t = setup(() => ({ data: { data: [] } }));
  await t.api.items.list({ search: '', category: undefined });
  await t.api.items.list({ search: 'bor' });
  await t.api.admin.requests({ status: '', search: '' });
  await t.api.admin.requests({ status: 'pending' });
  await t.api.borrow.mine({ status: 'returned' });
  assert.deepEqual(t.seen[0].params, {});
  assert.deepEqual(t.seen[1].params, { search: 'bor' });
  assert.deepEqual(t.seen[2].params, {});
  assert.deepEqual(t.seen[3].params, { status: 'pending' });
  assert.deepEqual(t.seen[4].params, { status: 'returned' });
});

test('endpoint, method & body setiap aksi', async () => {
  const t = setup(() => ({ data: { data: {} } }));
  await t.api.auth.login('a@b.co', 'pw');
  await t.api.auth.register('a@b.co', 'pw', 'A');
  await t.api.auth.me();
  await t.api.auth.updateProfile({ full_name: 'Baru' });
  await t.api.borrow.create({ item_id: 'i1', quantity: 2, borrow_date: '2026-11-04', due_date: '2026-11-06', note: 'n' });
  await t.api.borrow.cancel('r1');
  await t.api.admin.approve('r1', 'ok');
  await t.api.admin.reject('r1', 'no');
  await t.api.admin.pickup('r1');
  await t.api.admin.returnItem('r1');
  await t.api.admin.setRole('u1', 'admin');
  await t.api.admin.deleteUser('u1');
  await t.api.items.remove('i1');
  const got = t.seen.map((s) => `${s.method} ${s.url}`);
  assert.deepEqual(got, [
    'post /auth/login', 'post /auth/register', 'get /auth/me', 'put /users/me',
    'post /borrow-requests', 'patch /borrow-requests/r1/cancel',
    'patch /admin/borrow-requests/r1/approve', 'patch /admin/borrow-requests/r1/reject',
    'patch /admin/borrow-requests/r1/pickup', 'patch /admin/borrow-requests/r1/return',
    'patch /admin/users/u1/role', 'delete /admin/users/u1', 'delete /items/i1',
  ]);
  assert.deepEqual(t.seen[0].data, { email: 'a@b.co', password: 'pw' });
  assert.deepEqual(t.seen[4].data, { item_id: 'i1', quantity: 2, borrow_date: '2026-11-04', due_date: '2026-11-06', note: 'n' });
  assert.deepEqual(t.seen[6].data, { admin_note: 'ok' });
  assert.deepEqual(t.seen[10].data, { role: 'admin' });
});

test('401 pada request ber-token memicu onUnauthorized; tanpa token tidak', async () => {
  const t = setup(() => ({ status: 401, data: { success: false, message: 'Token tidak valid' } }));
  await assert.rejects(t.api.auth.me(), (e: any) => e.response.status === 401);
  assert.equal(t.unauthorizedCount(), 1);
  t.setToken(null);
  await assert.rejects(t.api.auth.login('a@b.co', 'salah'));
  assert.equal(t.unauthorizedCount(), 1); // login gagal bukan "sesi habis"
});

test('error server (409) diteruskan apa adanya untuk ditampilkan UI', async () => {
  const t = setup(() => ({ status: 409, data: { success: false, message: 'Stok tidak cukup' } }));
  await assert.rejects(t.api.borrow.create({ item_id: 'i', quantity: 1, borrow_date: 'a', due_date: 'b' }), (e: any) => e.response.data.message === 'Stok tidak cukup');
  assert.equal(t.unauthorizedCount(), 0);
});
