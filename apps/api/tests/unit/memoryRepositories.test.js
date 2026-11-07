const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryRepositories } = require('../../src/repositories/memory');

async function setup() {
  const repos = createMemoryRepositories();
  const u = await repos.profiles.create({ email: 'a@a.co', full_name: 'A' });
  const item = await repos.items.create({ name: 'Bor', quantity: 2 });
  return { repos, u, item };
}

test('items.create: available_quantity = quantity & status available', async () => {
  const { item } = await setup();
  assert.equal(item.available_quantity, 2);
  assert.equal(item.status, 'available');
});

test('items.adjustStock: atomik, tidak boleh < 0 atau > quantity', async () => {
  const { repos, item } = await setup();
  assert.equal((await repos.items.adjustStock(item.id, -1)).available_quantity, 1);
  const zero = await repos.items.adjustStock(item.id, -1);
  assert.equal(zero.available_quantity, 0);
  assert.equal(zero.status, 'borrowed'); // otomatis saat stok habis
  assert.equal(await repos.items.adjustStock(item.id, -1), null); // tidak cukup
  assert.equal((await repos.items.adjustStock(item.id, 2)).status, 'available');
  assert.equal(await repos.items.adjustStock(item.id, 1), null); // melebihi total
  assert.equal(await repos.items.adjustStock('tidak-ada', 1), null);
});

test('items.list: filter search/category/status (case-insensitive)', async () => {
  const { repos } = await setup();
  await repos.items.create({ name: 'Proyektor', category: 'Elektronik', description: 'untuk rapat' });
  assert.equal((await repos.items.list({ search: 'PROY' })).length, 1);
  assert.equal((await repos.items.list({ search: 'rapat' })).length, 1);
  assert.equal((await repos.items.list({ category: 'elektronik' })).length, 1);
  assert.equal((await repos.items.list({ status: 'unavailable' })).length, 0);
  assert.equal((await repos.items.list()).length, 2);
});

test('repo mengembalikan salinan (mutasi di luar tidak mengubah store)', async () => {
  const { repos, item } = await setup();
  item.name = 'DIUBAH';
  assert.equal((await repos.items.findById(item.id)).name, 'Bor');
});

test('borrows.transition: compare-and-set', async () => {
  const { repos, u, item } = await setup();
  const b = await repos.borrows.create({ item_id: item.id, borrower_id: u.id, borrow_date: '2026-11-02', due_date: '2026-11-03' });
  assert.equal(b.item.name, 'Bor');
  assert.equal(b.borrower.full_name, 'A');
  const ok = await repos.borrows.transition(b.id, ['pending'], { status: 'approved' });
  assert.equal(ok.status, 'approved');
  // percobaan kedua dengan asumsi status lama gagal
  assert.equal(await repos.borrows.transition(b.id, ['pending'], { status: 'rejected' }), null);
  assert.equal((await repos.borrows.findById(b.id)).status, 'approved');
});

test('borrows.list/count/exists dengan filter', async () => {
  const { repos, u, item } = await setup();
  const b1 = await repos.borrows.create({ item_id: item.id, borrower_id: u.id, borrow_date: '2026-11-02', due_date: '2026-11-03' });
  await repos.borrows.create({ item_id: item.id, borrower_id: u.id, borrow_date: '2026-11-02', due_date: '2026-11-03' });
  await repos.borrows.transition(b1.id, ['pending'], { status: 'rejected' });
  assert.equal(await repos.borrows.count(), 2);
  assert.equal(await repos.borrows.count({ status: 'pending' }), 1);
  assert.equal((await repos.borrows.list({ status: ['pending', 'rejected'] })).length, 2);
  assert.equal(await repos.borrows.exists({ borrower_id: u.id, status: ['approved'] }), false);
  assert.equal(await repos.borrows.exists({ item_id: item.id }), true);
  // terbaru dulu
  assert.notEqual((await repos.borrows.list())[0].id, b1.id);
});

test('profiles: findByEmail case-insensitive, update, delete, count', async () => {
  const { repos, u } = await setup();
  assert.equal((await repos.profiles.findByEmail('A@A.CO')).id, u.id);
  assert.equal((await repos.profiles.update(u.id, { role: 'admin' })).role, 'admin');
  assert.equal(await repos.profiles.update('x', { role: 'admin' }), null);
  assert.equal(await repos.profiles.count(), 1);
  await repos.profiles.delete(u.id);
  assert.equal(await repos.profiles.findById(u.id), null);
});
