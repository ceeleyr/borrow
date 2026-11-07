const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestContext } = require('../helpers/factory');

async function setup() {
  const ctx = await createTestContext();
  ctx.admin = (await ctx.makeUser('Admin Satu', { role: 'admin' })).user;
  ctx.budi = (await ctx.makeUser('Budi')).user;
  return ctx;
}
const due = '2026-11-05';

test('create: default kondisi good, stok penuh', async () => {
  const { services, admin } = await setup();
  const item = await services.items.create(admin, { name: 'Proyektor', quantity: 3, category: 'Elektronik' });
  assert.equal(item.condition, 'good');
  assert.equal(item.quantity, 3);
  assert.equal(item.available_quantity, 3);
  assert.equal(item.status, 'available');
  assert.equal(item.created_by, admin.id);
});

test('create: boleh langsung unavailable', async () => {
  const { services, admin } = await setup();
  const item = await services.items.create(admin, { name: 'Mic Rusak', status: 'unavailable' });
  assert.equal(item.status, 'unavailable');
});

test('create: validasi nama wajib', async () => {
  const { services, admin } = await setup();
  await assert.rejects(services.items.create(admin, { name: ' ' }), (e) => e.status === 400);
});

test('update: ubah field & set unavailable lalu available kembali', async () => {
  const { services, admin } = await setup();
  const item = await services.items.create(admin, { name: 'Bor', quantity: 2 });
  const u1 = await services.items.update(item.id, { name: 'Bor Bosch', status: 'unavailable' });
  assert.equal(u1.name, 'Bor Bosch');
  assert.equal(u1.status, 'unavailable');
  const u2 = await services.items.update(item.id, { status: 'available' });
  assert.equal(u2.status, 'available');
});

test('update: ubah quantity menyesuaikan stok tersedia', async () => {
  const { services, admin, budi, clock } = await setup();
  const item = await services.items.create(admin, { name: 'Kursi', quantity: 5 });
  const req = await services.borrows.create(budi, { item_id: item.id, quantity: 2, due_date: due });
  await services.borrows.approve(admin, req.id, {}); // 2 unit keluar -> tersedia 3
  const up = await services.items.update(item.id, { quantity: 10 });
  assert.equal(up.quantity, 10);
  assert.equal(up.available_quantity, 8);
  await assert.rejects(services.items.update(item.id, { quantity: 1 }), (e) => e.status === 409); // < 2 unit keluar
  assert.ok(clock);
});

test('update: stok habis -> status borrowed; admin set available tetap menurut stok', async () => {
  const { services, admin, budi } = await setup();
  const item = await services.items.create(admin, { name: 'Laptop', quantity: 1 });
  const req = await services.borrows.create(budi, { item_id: item.id, due_date: due });
  await services.borrows.approve(admin, req.id, {});
  assert.equal((await services.items.get(item.id)).status, 'borrowed');
  const up = await services.items.update(item.id, { status: 'available', description: 'x' });
  assert.equal(up.status, 'borrowed'); // tidak bisa "dipaksa" available saat stok 0
});

test('update/get/remove: id tidak ada -> 404', async () => {
  const { services } = await setup();
  await assert.rejects(services.items.get('x'), (e) => e.status === 404);
  await assert.rejects(services.items.update('x', { name: 'a' }), (e) => e.status === 404);
  await assert.rejects(services.items.remove('x'), (e) => e.status === 404);
});

test('remove: sukses bila belum punya riwayat, 409 bila sudah', async () => {
  const { services, admin, budi } = await setup();
  const a = await services.items.create(admin, { name: 'A' });
  const b = await services.items.create(admin, { name: 'B' });
  await services.items.remove(a.id);
  await assert.rejects(services.items.get(a.id), (e) => e.status === 404);
  await services.borrows.create(budi, { item_id: b.id, due_date: due });
  await assert.rejects(services.items.remove(b.id), (e) => e.status === 409 && e.code === 'ITEM_HAS_HISTORY');
});

test('list: filter search, category, status', async () => {
  const { services, admin } = await setup();
  await services.items.create(admin, { name: 'Proyektor', category: 'Elektronik' });
  await services.items.create(admin, { name: 'Tenda', category: 'Outdoor', status: 'unavailable' });
  assert.equal((await services.items.list({ search: 'tenda' })).length, 1);
  assert.equal((await services.items.list({ category: 'Elektronik' })).length, 1);
  assert.equal((await services.items.list({ status: 'unavailable' })).length, 1);
  assert.equal((await services.items.list({ status: 'ngawur' })).length, 2); // status tidak valid diabaikan
});

test('setImage', async () => {
  const { services, admin } = await setup();
  const item = await services.items.create(admin, { name: 'A' });
  const up = await services.items.setImage(item.id, 'http://x/y.png');
  assert.equal(up.image_url, 'http://x/y.png');
  await assert.rejects(services.items.setImage(item.id, ''), (e) => e.status === 400);
});
