const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestContext } = require('../helpers/factory');

async function setup() {
  const ctx = await createTestContext();
  ctx.admin = (await ctx.makeUser('Admin Satu', { role: 'admin' })).user;
  ctx.budi = (await ctx.makeUser('Budi')).user;
  return ctx;
}

test('stats: menghitung semua metrik', async () => {
  const { services, admin, budi } = await setup();
  const a = await services.items.create(admin, { name: 'A', quantity: 1 });
  const b = await services.items.create(admin, { name: 'B', quantity: 1 });
  await services.items.create(admin, { name: 'C', status: 'unavailable' });
  const r1 = await services.borrows.create(budi, { item_id: a.id, due_date: '2026-11-05' });
  await services.borrows.create(budi, { item_id: b.id, due_date: '2026-11-05' });
  await services.borrows.approve(admin, r1.id, {});
  const s = await services.admin.stats();
  assert.deepEqual(s, {
    totalUsers: 2,
    totalItems: 3,
    availableItems: 1, // A habis (borrowed), C unavailable
    totalRequests: 2,
    pendingRequests: 1,
    awaitingPickup: 1,
    activeBorrows: 0,
    overdue: 0,
  });
});

test('setRole: promosi user, tidak bisa ubah role sendiri, role tidak valid, user tak ada', async () => {
  const { services, admin, budi } = await setup();
  assert.equal((await services.admin.setRole(admin, budi.id, 'admin')).role, 'admin');
  await assert.rejects(services.admin.setRole(admin, admin.id, 'user'), (e) => e.status === 400);
  await assert.rejects(services.admin.setRole(admin, budi.id, 'root'), (e) => e.status === 400);
  await assert.rejects(services.admin.setRole(admin, 'x', 'user'), (e) => e.status === 404);
});

test('deleteUser: sukses bila tanpa riwayat; 409 bila punya riwayat; tidak bisa hapus diri sendiri', async () => {
  const { services, admin, budi, makeUser, repos } = await setup();
  const item = await services.items.create(admin, { name: 'A' });
  await services.borrows.create(budi, { item_id: item.id, due_date: '2026-11-05' });
  await assert.rejects(services.admin.deleteUser(admin, budi.id), (e) => e.status === 409);
  await assert.rejects(services.admin.deleteUser(admin, admin.id), (e) => e.status === 400);
  await assert.rejects(services.admin.deleteUser(admin, 'x'), (e) => e.status === 404);

  const sari = (await makeUser('Sari')).user;
  await services.admin.deleteUser(admin, sari.id);
  assert.equal(await repos.profiles.findById(sari.id), null);
});

test('getUser & listUsers', async () => {
  const { services, budi } = await setup();
  assert.equal((await services.admin.getUser(budi.id)).email, budi.email);
  assert.equal((await services.admin.listUsers()).length, 2);
  await assert.rejects(services.admin.getUser('x'), (e) => e.status === 404);
});
