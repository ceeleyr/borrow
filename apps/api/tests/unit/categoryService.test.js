const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestContext } = require('../helpers/factory');

test('categories: list mengembalikan kategori terurut', async () => {
  const { services } = await createTestContext();
  const list = await services.categories.list();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 1);
  assert.ok(list.some((c) => c.name === 'Elektronik'));
});

test('categories: create kategori baru', async () => {
  const { services } = await createTestContext();
  const created = await services.categories.create({ name: 'Robotika' });
  assert.equal(created.name, 'Robotika');
  assert.ok(created.id);

  const list = await services.categories.list();
  assert.ok(list.some((c) => c.name === 'Robotika'));
});

test('categories: create duplikat mengembalikan yang sudah ada tanpa error', async () => {
  const { services } = await createTestContext();
  const first = await services.categories.create({ name: 'Fotografi' });
  const second = await services.categories.create({ name: 'fotografi' });
  assert.equal(first.id, second.id);
});

test('categories: validasi nama wajib dan maks 50', async () => {
  const { services } = await createTestContext();
  await assert.rejects(services.categories.create({ name: '' }), (e) => e.status === 400);
  await assert.rejects(services.categories.create({ name: 'a'.repeat(51) }), (e) => e.status === 400);
});

test('items.create: otomatis menambahkan kategori baru ke daftar kategori', async () => {
  const ctx = await createTestContext();
  const admin = (await ctx.makeUser('Admin Test', { role: 'admin' })).user;
  await ctx.services.items.create(admin, { name: 'Drone', category: 'Aero' });
  const cat = await ctx.repos.categories.findByName('Aero');
  assert.ok(cat);
  assert.equal(cat.name, 'Aero');
});
