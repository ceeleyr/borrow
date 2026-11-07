const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createTestContext } = require('../helpers/factory');
const { createMemoryAuthProvider } = require('../../src/auth/memoryAuthProvider');

const reg = (over = {}) => ({ email: 'budi@mail.com', password: 'secret123', full_name: 'Budi', ...over });

test('register: membuat profil dengan role user & tanpa password di output', async () => {
  const { services } = await createTestContext();
  const p = await services.auth.register(reg());
  assert.equal(p.role, 'user');
  assert.equal(p.email, 'budi@mail.com');
  assert.equal('password' in p, false);
});

test('register: email duplikat (case-insensitive) -> 409', async () => {
  const { services } = await createTestContext();
  await services.auth.register(reg());
  await assert.rejects(services.auth.register(reg({ email: 'BUDI@mail.com' })), (e) => e.status === 409);
});

test('register: input tidak valid -> 400', async () => {
  const { services } = await createTestContext();
  await assert.rejects(services.auth.register(reg({ password: '1' })), (e) => e.status === 400);
});

test('register: rollback akun auth bila pembuatan profil gagal', async () => {
  const { services, repos, authProvider } = await createTestContext();
  const original = repos.profiles.create;
  repos.profiles.create = async () => {
    throw new Error('db down');
  };
  await assert.rejects(services.auth.register(reg()), /db down/);
  repos.profiles.create = original;
  // login harus gagal karena akun auth sudah di-rollback
  await assert.rejects(authProvider.login('budi@mail.com', 'secret123'), (e) => e.status === 401);
});

test('login: sukses mengembalikan profil + token', async () => {
  const { services } = await createTestContext();
  await services.auth.register(reg());
  const res = await services.auth.login({ email: 'Budi@Mail.com', password: 'secret123' });
  assert.equal(res.user.full_name, 'Budi');
  assert.ok(res.access_token.split('.').length === 3);
});

test('login: password salah / email tak dikenal -> 401 dengan pesan sama', async () => {
  const { services } = await createTestContext();
  await services.auth.register(reg());
  const bad1 = await services.auth.login({ email: 'budi@mail.com', password: 'salah!!' }).catch((e) => e);
  const bad2 = await services.auth.login({ email: 'x@mail.com', password: 'secret123' }).catch((e) => e);
  assert.equal(bad1.status, 401);
  assert.equal(bad2.status, 401);
  assert.equal(bad1.message, bad2.message); // tidak membocorkan keberadaan email
});

test('authenticate: token valid -> profil terbaru; token rusak -> null', async () => {
  const { services, repos } = await createTestContext();
  const p = await services.auth.register(reg());
  const { access_token } = await services.auth.login({ email: p.email, password: 'secret123' });
  assert.equal((await services.auth.authenticate(access_token)).id, p.id);
  await repos.profiles.update(p.id, { role: 'admin' });
  assert.equal((await services.auth.authenticate(access_token)).role, 'admin'); // role selalu fresh
  assert.equal(await services.auth.authenticate('abc.def.ghi'), null);
  assert.equal(await services.auth.authenticate(jwt.sign({ sub: p.id }, 'secret-lain')), null);
});

test('token kedaluwarsa ditolak', async () => {
  const provider = createMemoryAuthProvider({ jwtSecret: 's', tokenTtl: '-1s' });
  const { id } = await provider.register('a@a.co', 'secret123');
  const { access_token } = await provider.login('a@a.co', 'secret123');
  assert.equal(await provider.verifyToken(access_token), null);
  assert.ok(id);
});

test('updateProfile', async () => {
  const { services } = await createTestContext();
  const p = await services.auth.register(reg());
  const upd = await services.auth.updateProfile(p.id, { full_name: 'Budi Baru' });
  assert.equal(upd.full_name, 'Budi Baru');
  await assert.rejects(services.auth.updateProfile(p.id, {}), (e) => e.status === 400);
  await assert.rejects(services.auth.updateProfile('tidak-ada', { full_name: 'X' }), (e) => e.status === 404);
});
