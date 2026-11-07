const test = require('node:test');
const assert = require('node:assert/strict');
const { createTestContext } = require('../helpers/factory');
const { seedDemo, DEMO_PASSWORD } = require('../../src/seed');

test('seedDemo: data contoh konsisten (stok, status, overdue) & akun bisa login', async () => {
  const ctx = await createTestContext();
  await seedDemo({ repos: ctx.repos, authProvider: ctx.authProvider, clock: ctx.clock });

  const login = await ctx.services.auth.login({ email: 'admin@borrow.test', password: DEMO_PASSWORD });
  assert.equal(login.user.role, 'admin');

  const stats = await ctx.services.admin.stats();
  assert.equal(stats.totalUsers, 3);
  assert.equal(stats.totalItems, 8);
  assert.equal(stats.totalRequests, 5);
  assert.equal(stats.pendingRequests, 1);
  assert.equal(stats.awaitingPickup, 1);
  assert.equal(stats.activeBorrows, 1);
  assert.equal(stats.overdue, 1);

  // Invarian: stok tersedia = total - unit yang ditahan (approved + borrowed)
  const items = await ctx.repos.items.list();
  const reqs = await ctx.repos.borrows.list();
  for (const it of items) {
    const held = reqs.filter((r) => r.item_id === it.id && ['approved', 'borrowed'].includes(r.status)).reduce((s, r) => s + r.quantity, 0);
    assert.equal(it.available_quantity, it.quantity - held, `stok ${it.name}`);
  }
});
