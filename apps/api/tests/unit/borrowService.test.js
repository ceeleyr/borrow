const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestContext } = require('../helpers/factory');

async function setup(quantity = 2) {
  const ctx = await createTestContext();
  ctx.admin = (await ctx.makeUser('Admin Satu', { role: 'admin' })).user;
  ctx.superadmin = (await ctx.makeUser('Superadmin Satu', { role: 'superadmin' })).user;
  ctx.budi = (await ctx.makeUser('Budi')).user;
  ctx.sari = (await ctx.makeUser('Sari')).user;
  ctx.item = await ctx.services.items.create(ctx.admin, { name: 'Proyektor', quantity });
  ctx.stock = async () => (await ctx.repos.items.findById(ctx.item.id)).available_quantity;
  ctx.itemStatus = async () => (await ctx.repos.items.findById(ctx.item.id)).status;
  return ctx;
}
const body = (item, extra = {}) => ({ item_id: item.id, borrow_date: '2026-11-02', due_date: '2026-11-05', ...extra });

// ---------- create ----------
test('create: pending, tidak menahan stok', async () => {
  const { services, budi, item, stock } = await setup();
  const r = await services.borrows.create(budi, body(item, { note: 'rapat' }));
  assert.equal(r.status, 'pending');
  assert.equal(r.borrower_id, budi.id);
  assert.equal(r.quantity, 1);
  assert.equal(r.note, 'rapat');
  assert.equal(r.is_overdue, false);
  assert.equal(await stock(), 2);
});

test('create: item tidak ada -> 404; item unavailable -> 409', async () => {
  const { services, budi, admin, item } = await setup();
  await assert.rejects(services.borrows.create(budi, { item_id: 'x', due_date: '2026-11-05' }), (e) => e.status === 404);
  await services.items.update(item.id, { status: 'unavailable' });
  await assert.rejects(services.borrows.create(budi, body(item)), (e) => e.status === 409 && e.code === 'ITEM_UNAVAILABLE');
  assert.ok(admin);
});

test('create: quantity melebihi stok -> 409', async () => {
  const { services, budi, item } = await setup(2);
  await assert.rejects(services.borrows.create(budi, body(item, { quantity: 3 })), (e) => e.code === 'INSUFFICIENT_STOCK');
});

test('create: pengajuan aktif ganda untuk barang yang sama -> 409; setelah selesai boleh lagi', async () => {
  const { services, budi, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item));
  await assert.rejects(services.borrows.create(budi, body(item)), (e) => e.code === 'DUPLICATE_REQUEST');
  await services.borrows.reject(admin, r.id, {});
  await assert.doesNotReject(services.borrows.create(budi, body(item)));
});

test('create: validasi tanggal', async () => {
  const { services, budi, item } = await setup();
  await assert.rejects(services.borrows.create(budi, body(item, { due_date: '2026-11-01' })), (e) => e.status === 400);
  await assert.rejects(services.borrows.create(budi, body(item, { due_date: undefined })), (e) => e.status === 400);
});

// ---------- alur lengkap & stok ----------
test('alur lengkap: pending -> approved -> borrowed -> returned dengan stok konsisten', async () => {
  const { services, budi, admin, item, stock, itemStatus } = await setup(1);
  const r = await services.borrows.create(budi, body(item));

  const approved = await services.borrows.approve(admin, r.id, { admin_note: 'Ambil jam 9' });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approved_by, admin.id);
  assert.equal(approved.admin_note, 'Ambil jam 9');
  assert.ok(approved.approved_at);
  assert.equal(await stock(), 0); // stok ditahan sejak approve
  assert.equal(await itemStatus(), 'borrowed');

  const picked = await services.borrows.pickup(admin, r.id);
  assert.equal(picked.status, 'borrowed');
  assert.ok(picked.picked_up_at);

  const returned = await services.borrows.returnItem(admin, r.id, { admin_note: 'Kondisi baik' });
  assert.equal(returned.status, 'returned');
  assert.ok(returned.returned_at);
  assert.equal(returned.admin_note, 'Kondisi baik');
  assert.equal(await stock(), 1);
  assert.equal(await itemStatus(), 'available');
});

test('reject: status rejected, stok tidak berubah, alasan tersimpan', async () => {
  const { services, budi, admin, item, stock } = await setup();
  const r = await services.borrows.create(budi, body(item));
  const rej = await services.borrows.reject(admin, r.id, { reason: 'Dipakai internal' });
  assert.equal(rej.status, 'rejected');
  assert.equal(rej.admin_note, 'Dipakai internal');
  assert.ok(rej.rejected_at);
  assert.equal(await stock(), 2);
});

test('transisi tidak valid -> 409 INVALID_TRANSITION', async () => {
  const { services, budi, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item));
  const bad = (p) => assert.rejects(p, (e) => e.status === 409 && e.code === 'INVALID_TRANSITION');
  await bad(services.borrows.pickup(admin, r.id)); // pending -> borrowed (lompat)
  await bad(services.borrows.returnItem(admin, r.id, {})); // pending -> returned
  await services.borrows.approve(admin, r.id, {});
  await bad(services.borrows.approve(admin, r.id, {})); // approve dua kali
  await bad(services.borrows.reject(admin, r.id, {})); // reject setelah approved
  await bad(services.borrows.returnItem(admin, r.id, {})); // belum diambil
});

test('approve: stok tak cukup (dihabiskan request lain) -> 409 dan request tetap pending', async () => {
  const { services, budi, sari, admin, item, stock } = await setup(1);
  const r1 = await services.borrows.create(budi, body(item));
  const r2 = await services.borrows.create(sari, body(item)); // keduanya masih pending, stok 1
  await services.borrows.approve(admin, r1.id, {});
  await assert.rejects(services.borrows.approve(admin, r2.id, {}), (e) => e.code === 'INSUFFICIENT_STOCK');
  assert.equal((await services.borrows.get(admin, r2.id)).status, 'pending');
  assert.equal(await stock(), 0);
});

test('approve: item dinonaktifkan admin -> 409', async () => {
  const { services, budi, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item));
  await services.items.update(item.id, { status: 'unavailable' });
  await assert.rejects(services.borrows.approve(admin, r.id, {}), (e) => e.code === 'ITEM_UNAVAILABLE');
});

test('approve bersamaan (race): hanya satu yang berhasil, stok hanya berkurang sekali', async () => {
  const { services, budi, admin, item, stock } = await setup(5);
  const r = await services.borrows.create(budi, body(item));
  const results = await Promise.allSettled([
    services.borrows.approve(admin, r.id, {}),
    services.borrows.approve(admin, r.id, {}),
  ]);
  assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
  assert.equal(await stock(), 4);
});

test('multi-unit: quantity 2 menahan & mengembalikan 2 unit', async () => {
  const { services, budi, admin, item, stock } = await setup(3);
  const r = await services.borrows.create(budi, body(item, { quantity: 2 }));
  await services.borrows.approve(admin, r.id, {});
  assert.equal(await stock(), 1);
  await services.borrows.pickup(admin, r.id);
  await services.borrows.returnItem(admin, r.id, {});
  assert.equal(await stock(), 3);
});

// ---------- cancel ----------
test('cancel oleh peminjam: hanya pending & milik sendiri', async () => {
  const { services, budi, sari, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item));
  await assert.rejects(services.borrows.cancel(sari, r.id, {}), (e) => e.status === 403);
  const c = await services.borrows.cancel(budi, r.id, {});
  assert.equal(c.status, 'cancelled');
  assert.ok(c.cancelled_at);

  const r2 = await services.borrows.create(budi, body(item));
  await services.borrows.approve(admin, r2.id, {});
  await assert.rejects(services.borrows.cancel(budi, r2.id, {}), (e) => e.status === 409); // sudah approved
});

test('cancel oleh admin pada approved: stok dikembalikan', async () => {
  const { services, budi, admin, item, stock } = await setup(1);
  const r = await services.borrows.create(budi, body(item));
  await services.borrows.approve(admin, r.id, {});
  assert.equal(await stock(), 0);
  const c = await services.borrows.cancel(admin, r.id, { admin_note: 'Batal, acara dipindah' });
  assert.equal(c.status, 'cancelled');
  assert.equal(c.admin_note, 'Batal, acara dipindah');
  assert.equal(await stock(), 1);
});

test('cancel tidak bisa untuk status borrowed/returned', async () => {
  const { services, budi, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item));
  await services.borrows.approve(admin, r.id, {});
  await services.borrows.pickup(admin, r.id);
  await assert.rejects(services.borrows.cancel(admin, r.id, {}), (e) => e.code === 'INVALID_TRANSITION');
});

test('superadmin dapat mengakses detail dan membatalkan request sebagai admin', async () => {
  const { services, budi, superadmin, item, stock } = await setup();
  const r = await services.borrows.create(budi, body(item));
  assert.equal((await services.borrows.get(superadmin, r.id)).borrower_id, budi.id);
  await services.borrows.approve(superadmin, r.id, {});
  const cancelled = await services.borrows.cancel(superadmin, r.id, { admin_note: 'Dibatalkan admin' });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.admin_note, 'Dibatalkan admin');
  assert.equal(await stock(), 2);
});

// ---------- read ----------
test('get: peminjam hanya bisa lihat miliknya; admin bisa semua; 404 bila tak ada', async () => {
  const { services, budi, sari, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item));
  assert.equal((await services.borrows.get(budi, r.id)).id, r.id);
  assert.equal((await services.borrows.get(admin, r.id)).item.name, 'Proyektor');
  await assert.rejects(services.borrows.get(sari, r.id), (e) => e.status === 403);
  await assert.rejects(services.borrows.get(budi, 'x'), (e) => e.status === 404);
});

test('listMine: hanya milik sendiri, bisa filter status, terbaru dulu', async () => {
  const { services, budi, sari, admin, item } = await setup();
  const other = await services.items.create(admin, { name: 'Tenda' });
  const a = await services.borrows.create(budi, body(item));
  await services.borrows.create(budi, body(other));
  await services.borrows.create(sari, body(item));
  await services.borrows.reject(admin, a.id, {});
  const mine = await services.borrows.listMine(budi.id);
  assert.equal(mine.length, 2);
  assert.equal(mine[0].item.name, 'Tenda');
  assert.equal((await services.borrows.listMine(budi.id, { status: 'rejected' })).length, 1);
});

test('listAll (admin): filter status & pencarian nama peminjam/barang', async () => {
  const { services, budi, sari, admin, item } = await setup();
  const other = await services.items.create(admin, { name: 'Tenda' });
  await services.borrows.create(budi, body(item));
  const r2 = await services.borrows.create(sari, body(other));
  await services.borrows.reject(admin, r2.id, {});
  assert.equal((await services.borrows.listAll()).length, 2);
  assert.equal((await services.borrows.listAll({ status: 'pending' })).length, 1);
  assert.equal((await services.borrows.listAll({ search: 'sari' })).length, 1);
  assert.equal((await services.borrows.listAll({ search: 'proyek' })).length, 1);
  assert.equal((await services.borrows.listAll({ search: 'tidak-ada' })).length, 0);
});

// ---------- overdue ----------
test('is_overdue: true setelah lewat due_date selama masih borrowed', async () => {
  const { services, clock, budi, admin, item } = await setup();
  const r = await services.borrows.create(budi, body(item, { due_date: '2026-11-04' }));
  await services.borrows.approve(admin, r.id, {});
  await services.borrows.pickup(admin, r.id);
  assert.equal((await services.borrows.get(admin, r.id)).is_overdue, false);
  clock.advanceDays(3); // 2026-11-05 > due 2026-11-04
  assert.equal((await services.borrows.get(admin, r.id)).is_overdue, true);
  assert.equal((await services.admin.stats()).overdue, 1);
  await services.borrows.returnItem(admin, r.id, {});
  assert.equal((await services.borrows.get(admin, r.id)).is_overdue, false);
  assert.equal((await services.admin.stats()).overdue, 0);
});
