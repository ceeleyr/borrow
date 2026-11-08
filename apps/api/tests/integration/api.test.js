const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createTestContext, startServer } = require('../helpers/factory');

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let ctx, srv, admin, superadmin, budi, sari;

test.before(async () => {
  ctx = await createTestContext();
  srv = await startServer(ctx.app);
  admin = await ctx.makeUser('Admin Satu', { role: 'admin' });
  superadmin = await ctx.makeUser('Superadmin Satu', { role: 'superadmin' });
  budi = await ctx.makeUser('Budi');
  sari = await ctx.makeUser('Sari');
});
test.after(async () => {
  await srv.close();
});

const api = (...a) => srv.request(...a);

test('GET /health', async () => {
  const r = await api('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('route tidak dikenal -> 404 JSON; JSON rusak -> 400', async () => {
  const r = await api('GET', '/api/tidak-ada');
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
  const bad = await api('POST', '/api/auth/login', { body: '{bukan json' });
  assert.equal(bad.status, 400);
  assert.match(bad.body.message, /JSON/);
});

// ---------------- Auth ----------------
test('register -> login -> me', async () => {
  const reg = await api('POST', '/api/auth/register', { body: { email: 'baru@mail.com', password: 'secret123', full_name: 'Baru' } });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.data.role, 'user');
  const login = await api('POST', '/api/auth/login', { body: { email: 'baru@mail.com', password: 'secret123' } });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.role, 'user');
  const me = await api('GET', '/api/auth/me', { token: login.body.data.access_token });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, 'baru@mail.com');
});

test('register duplikat 409, input salah 400, login salah 401', async () => {
  const body = { email: 'baru@mail.com', password: 'secret123', full_name: 'Baru' };
  assert.equal((await api('POST', '/api/auth/register', { body })).status, 409);
  assert.equal((await api('POST', '/api/auth/register', { body: { email: 'x' } })).status, 400);
  assert.equal((await api('POST', '/api/auth/login', { body: { email: 'baru@mail.com', password: 'salah-salah' } })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { body: {} })).status, 400);
});

test('endpoint terproteksi: tanpa token / token palsu -> 401', async () => {
  assert.equal((await api('GET', '/api/auth/me')).status, 401);
  assert.equal((await api('GET', '/api/borrow-requests/mine', { token: 'palsu' })).status, 401);
  assert.equal((await api('POST', '/api/items', { body: { name: 'x' } })).status, 401);
});

test('PUT /api/users/me memperbarui profil', async () => {
  const r = await api('PUT', '/api/users/me', { token: sari.token, body: { full_name: 'Sari W.' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.full_name, 'Sari W.');
  assert.equal((await api('PUT', '/api/users/me', { token: sari.token, body: {} })).status, 400);
});

// ---------------- RBAC ----------------
test('user biasa tidak bisa memakai fitur admin (403)', async () => {
  const t = budi.token;
  const checks = [
    ['POST', '/api/items', { name: 'x' }],
    ['PUT', '/api/items/abc', { name: 'x' }],
    ['DELETE', '/api/items/abc'],
    ['GET', '/api/users'],
    ['GET', '/api/users/abc'],
    ['GET', '/api/admin/stats'],
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/borrow-requests'],
    ['PATCH', '/api/admin/borrow-requests/abc/approve'],
    ['PATCH', '/api/admin/borrow-requests/abc/pickup'],
    ['PATCH', '/api/admin/users/abc/role', { role: 'admin' }],
    ['DELETE', '/api/admin/users/abc'],
  ];
  for (const [m, url, body] of checks) {
    const r = await api(m, url, { token: t, body });
    assert.equal(r.status, 403, `${m} ${url}`);
  }
});

test('admin tidak mengajukan peminjaman (khusus user)', async () => {
  const r = await api('POST', '/api/borrow-requests', { token: admin.token, body: { item_id: 'x', due_date: '2026-11-05' } });
  assert.equal(r.status, 403);
});

test('admin biasa tidak bisa mengelola pengguna', async () => {
  const checks = [
    ['GET', '/api/users'],
    ['GET', '/api/users'],
    ['GET', `/api/users/${budi.user.id}`],
    ['GET', '/api/admin/users'],
    ['PATCH', `/api/admin/users/${budi.user.id}/role`, { role: 'admin' }],
    ['DELETE', `/api/admin/users/${budi.user.id}`],
  ];
  for (const [method, url, body] of checks) {
    const response = await api(method, url, { token: admin.token, body });
    assert.equal(response.status, 403, `${method} ${url}`);
  }
});

// ---------------- Barang ----------------
let itemId;
test('admin CRUD barang + katalog publik', async () => {
  const created = await api('POST', '/api/items', {
    token: admin.token,
    body: { name: 'Proyektor', description: 'Epson', category: 'Elektronik', condition: 'good', quantity: 2 },
  });
  assert.equal(created.status, 201);
  itemId = created.body.data.id;
  assert.equal(created.body.data.available_quantity, 2);

  assert.equal((await api('POST', '/api/items', { token: admin.token, body: {} })).status, 400);

  // publik (tanpa token) bisa melihat katalog & detail
  const list = await api('GET', '/api/items?search=proy');
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal((await api('GET', `/api/items/${itemId}`)).body.data.name, 'Proyektor');
  assert.equal((await api('GET', '/api/items/tidak-ada')).status, 404);

  const upd = await api('PUT', `/api/items/${itemId}`, { token: admin.token, body: { condition: 'fair' } });
  assert.equal(upd.body.data.condition, 'fair');
  assert.equal((await api('PUT', '/api/items/tidak-ada', { token: admin.token, body: { name: 'a' } })).status, 404);
});

test('upload gambar: sukses (png), tolak non-gambar, tolak tanpa file, butuh admin', async () => {
  const form = new FormData();
  form.append('image', new Blob([PNG], { type: 'image/png' }), 'foto.png');
  const ok = await api('POST', `/api/items/${itemId}/image`, { token: admin.token, form });
  assert.equal(ok.status, 200);
  const url = ok.body.data.image_url;
  assert.match(url, /\/uploads\/.+\.png$/);
  // file benar-benar bisa diakses lewat static server
  const img = await fetch(url.replace(/^https?:\/\/[^/]+/, srv.base));
  assert.equal(img.status, 200);
  assert.equal(Buffer.from(await img.arrayBuffer()).length, PNG.length);

  const txt = new FormData();
  txt.append('image', new Blob(['hai'], { type: 'text/plain' }), 'a.txt');
  assert.equal((await api('POST', `/api/items/${itemId}/image`, { token: admin.token, form: txt })).status, 400);
  assert.equal((await api('POST', `/api/items/${itemId}/image`, { token: admin.token, form: new FormData() })).status, 400);

  const f2 = new FormData();
  f2.append('image', new Blob([PNG], { type: 'image/png' }), 'foto.png');
  assert.equal((await api('POST', `/api/items/${itemId}/image`, { token: budi.token, form: f2 })).status, 403);
  assert.ok(fs.readdirSync(ctx.uploadDir).length >= 1);
  assert.ok(path.basename(url));
});

// ---------------- Alur peminjaman end-to-end ----------------
test('alur lengkap via HTTP: ajukan -> approve -> pickup -> return -> riwayat', async () => {
  const create = await api('POST', '/api/borrow-requests', {
    token: budi.token,
    body: { item_id: itemId, quantity: 1, borrow_date: '2026-11-02', due_date: '2026-11-05', note: 'Rapat RT' },
  });
  assert.equal(create.status, 201);
  const id = create.body.data.id;
  assert.equal(create.body.data.status, 'pending');
  assert.equal(create.body.data.borrow_date, '2026-11-02T00:00:00');

  // user tidak bisa memproses requestnya sendiri
  assert.equal((await api('PATCH', `/api/admin/borrow-requests/${id}/approve`, { token: budi.token })).status, 403);

  // user lain tidak bisa melihat detail
  assert.equal((await api('GET', `/api/borrow-requests/${id}`, { token: sari.token })).status, 403);
  assert.equal((await api('GET', `/api/borrow-requests/${id}`, { token: budi.token })).status, 200);

  // admin melihat antrean
  const queue = await api('GET', '/api/admin/borrow-requests?status=pending', { token: admin.token });
  assert.equal(queue.body.data.length, 1);
  assert.equal(queue.body.data[0].borrower.full_name, 'Budi');

  const approve = await api('PATCH', `/api/admin/borrow-requests/${id}/approve`, { token: admin.token, body: { admin_note: 'OK' } });
  assert.equal(approve.status, 200);
  assert.equal(approve.body.data.status, 'approved');
  assert.equal((await api('GET', `/api/items/${itemId}`)).body.data.available_quantity, 1);

  // approve kedua -> konflik
  assert.equal((await api('PATCH', `/api/admin/borrow-requests/${id}/approve`, { token: admin.token })).status, 409);
  // return sebelum pickup -> konflik
  assert.equal((await api('PATCH', `/api/admin/borrow-requests/${id}/return`, { token: admin.token })).status, 409);

  const pickup = await api('PATCH', `/api/admin/borrow-requests/${id}/pickup`, { token: admin.token });
  assert.equal(pickup.body.data.status, 'borrowed');

  const ret = await api('PATCH', `/api/admin/borrow-requests/${id}/return`, { token: admin.token, body: { admin_note: 'Lengkap' } });
  assert.equal(ret.body.data.status, 'returned');
  assert.equal((await api('GET', `/api/items/${itemId}`)).body.data.available_quantity, 2);

  // riwayat peminjam & admin
  const mine = await api('GET', '/api/borrow-requests/mine', { token: budi.token });
  assert.equal(mine.body.data.length, 1);
  assert.equal(mine.body.data[0].status, 'returned');
  assert.equal(mine.body.data[0].item.name, 'Proyektor');
  assert.equal((await api('GET', '/api/borrow-requests/mine', { token: sari.token })).body.data.length, 0);
  assert.equal((await api('GET', '/api/admin/borrow-requests?status=returned', { token: admin.token })).body.data.length, 1);
});

test('alur tolak & batal via HTTP', async () => {
  const mk = async (token) =>
    (await api('POST', '/api/borrow-requests', { token, body: { item_id: itemId, due_date: '2026-11-04' } })).body.data.id;

  const a = await mk(budi.token);
  const rej = await api('PATCH', `/api/admin/borrow-requests/${a}/reject`, { token: admin.token, body: { reason: 'Dipakai' } });
  assert.equal(rej.body.data.status, 'rejected');
  assert.equal(rej.body.data.admin_note, 'Dipakai');

  const b = await mk(budi.token);
  assert.equal((await api('PATCH', `/api/borrow-requests/${b}/cancel`, { token: sari.token })).status, 403);
  const cancel = await api('PATCH', `/api/borrow-requests/${b}/cancel`, { token: budi.token });
  assert.equal(cancel.body.data.status, 'cancelled');
  assert.equal((await api('PATCH', `/api/borrow-requests/${b}/cancel`, { token: budi.token })).status, 409);
});

test('validasi pengajuan via HTTP', async () => {
  const post = (body) => api('POST', '/api/borrow-requests', { token: sari.token, body });
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ item_id: itemId })).status, 400); // due_date wajib
  assert.equal((await post({ item_id: itemId, due_date: '2026-11-01' })).status, 400); // sebelum borrow_date (hari ini)
  assert.equal((await post({ item_id: 'tidak-ada', due_date: '2026-11-05' })).status, 404);
  assert.equal((await post({ item_id: itemId, due_date: '2026-11-05', quantity: 99 })).status, 409);
});

test('hapus barang yang punya riwayat -> 409; barang baru bisa dihapus', async () => {
  assert.equal((await api('DELETE', `/api/items/${itemId}`, { token: admin.token })).status, 409);
  const n = await api('POST', '/api/items', { token: admin.token, body: { name: 'Sementara' } });
  assert.equal((await api('DELETE', `/api/items/${n.body.data.id}`, { token: admin.token })).status, 200);
  assert.equal((await api('GET', `/api/items/${n.body.data.id}`)).status, 404);
});

// ---------------- Admin: stats & user ----------------
test('admin stats & superadmin manajemen user', async () => {
  const stats = await api('GET', '/api/admin/stats', { token: admin.token });
  assert.equal(stats.status, 200);
  assert.equal(stats.body.data.totalItems, 1);
  assert.equal(stats.body.data.totalRequests, 3);
  assert.equal(stats.body.data.pendingRequests, 0);

  const users = await api('GET', '/api/admin/users', { token: superadmin.token });
  assert.ok(users.body.data.length >= 3);
  assert.equal((await api('GET', '/api/users', { token: superadmin.token })).status, 200);

  const promoteSuperadmin = await api('PATCH', `/api/admin/users/${sari.user.id}/role`, { token: superadmin.token, body: { role: 'superadmin' } });
  assert.equal(promoteSuperadmin.body.data.role, 'superadmin');
  assert.equal((await api('GET', '/api/admin/users', { token: sari.token })).status, 200);
  const promote = await api('PATCH', `/api/admin/users/${sari.user.id}/role`, { token: superadmin.token, body: { role: 'admin' } });
  assert.equal(promote.body.data.role, 'admin');
  // token Sari yang sama langsung punya akses admin (role dibaca fresh)
  assert.equal((await api('GET', '/api/admin/stats', { token: sari.token })).status, 200);
  const demote = await api('PATCH', `/api/admin/users/${sari.user.id}/role`, { token: superadmin.token, body: { role: 'user' } });
  assert.equal(demote.body.data.role, 'user');
  assert.equal((await api('GET', '/api/admin/stats', { token: sari.token })).status, 403);

  assert.equal((await api('PATCH', `/api/admin/users/${superadmin.user.id}/role`, { token: superadmin.token, body: { role: 'admin' } })).status, 400);
  assert.equal((await api('DELETE', `/api/admin/users/${budi.user.id}`, { token: superadmin.token })).status, 409); // punya riwayat
  assert.equal((await api('GET', `/api/users/${budi.user.id}`, { token: superadmin.token })).body.data.email, budi.email);
});
