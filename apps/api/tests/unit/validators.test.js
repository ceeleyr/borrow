const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../../src/lib/validators');

const NOW = new Date('2026-11-02T08:00:00Z');
const throwsBad = (fn, re) => assert.throws(fn, (e) => e.status === 400 && (!re || re.test(e.message)));

test('validateRegister: normalisasi & aturan', () => {
  const ok = v.validateRegister({ email: '  Budi@Mail.COM ', password: 'abcdef', full_name: ' Budi ' });
  assert.deepEqual(ok, { email: 'budi@mail.com', password: 'abcdef', full_name: 'Budi' });
  throwsBad(() => v.validateRegister({}), /wajib/);
  throwsBad(() => v.validateRegister({ email: 'bukan-email', password: 'abcdef', full_name: 'x' }), /email/i);
  throwsBad(() => v.validateRegister({ email: 'a@b.co', password: '123', full_name: 'x' }), /minimal 6/);
  throwsBad(() => v.validateRegister({ email: 'a@b.co', password: 'abcdef', full_name: 'x'.repeat(101) }), /maksimal/);
});

test('validateLogin', () => {
  assert.deepEqual(v.validateLogin({ email: ' A@B.co ', password: 'x' }), { email: 'a@b.co', password: 'x' });
  throwsBad(() => v.validateLogin({ email: 'a@b.co' }), /wajib/);
});

test('validateItem (create): default & aturan', () => {
  const ok = v.validateItem({ name: ' Bor ', quantity: '3', condition: 'fair', description: '  ' });
  assert.equal(ok.name, 'Bor');
  assert.equal(ok.quantity, 3);
  assert.equal(ok.description, null); // string kosong -> null
  throwsBad(() => v.validateItem({}), /name wajib/);
  throwsBad(() => v.validateItem({ name: 'x', quantity: 0 }), /minimal 1/);
  throwsBad(() => v.validateItem({ name: 'x', quantity: 1.5 }), /bulat/);
  throwsBad(() => v.validateItem({ name: 'x', quantity: 'abc' }), /bulat/);
  throwsBad(() => v.validateItem({ name: 'x', condition: 'rusak-parah' }), /condition/);
  throwsBad(() => v.validateItem({ name: 'x', status: 'borrowed' }), /status/);
  throwsBad(() => v.validateItem({ name: 'x', image_url: 'ftp://x' }), /image_url/);
  assert.equal(v.validateItem({ name: 'x', image_url: 'https://a.co/i.png' }).image_url, 'https://a.co/i.png');
});

test('validateItem (partial): minimal satu field', () => {
  assert.deepEqual(v.validateItem({ category: 'Audio' }, { partial: true }), { category: 'Audio' });
  throwsBad(() => v.validateItem({}, { partial: true }), /Tidak ada data/);
  throwsBad(() => v.validateItem({ name: '  ' }, { partial: true }), /name wajib/);
});

test('validateBorrowRequest: kasus valid', () => {
  const r = v.validateBorrowRequest({ item_id: 'i1', borrow_date: '2026-11-03', due_date: '2026-11-06', quantity: '2', note: ' halo ' }, NOW);
  assert.deepEqual(r, { item_id: 'i1', quantity: 2, borrow_date: '2026-11-03T00:00:00', due_date: '2026-11-06', note: 'halo' });
  const withTime = v.validateBorrowRequest({ item_id: 'i1', borrow_date: '2026-11-03T09:30:00', due_date: '2026-11-06' }, NOW);
  assert.equal(withTime.borrow_date, '2026-11-03T09:30:00');
  // borrow_date default = hari ini
  assert.equal(v.validateBorrowRequest({ item_id: 'i1', due_date: '2026-11-04' }, NOW).borrow_date, '2026-11-02T00:00:00');
});

test('validateBorrowRequest: kasus tidak valid', () => {
  const base = { item_id: 'i1', borrow_date: '2026-11-03', due_date: '2026-11-05' };
  throwsBad(() => v.validateBorrowRequest({ ...base, item_id: '' }, NOW), /item_id/);
  throwsBad(() => v.validateBorrowRequest({ ...base, due_date: undefined }, NOW), /due_date/);
  throwsBad(() => v.validateBorrowRequest({ ...base, due_date: '2026-11-02' }, NOW), /sebelum tanggal pinjam/);
  throwsBad(() => v.validateBorrowRequest({ ...base, borrow_date: '2026-10-20' }, NOW), /masa lalu/);
  throwsBad(() => v.validateBorrowRequest({ ...base, borrow_date: 'besok' }, NOW), /borrow_date/);
  throwsBad(() => v.validateBorrowRequest({ ...base, borrow_date: '2026-11-03T25:00:00' }, NOW), /borrow_date/);
  throwsBad(() => v.validateBorrowRequest({ ...base, due_date: '2026-12-31' }, NOW), /maksimal 30 hari/);
  throwsBad(() => v.validateBorrowRequest({ ...base, quantity: -1 }, NOW), /minimal 1/);
  // toleransi 1 hari ke belakang (beda zona waktu) masih boleh
  assert.doesNotThrow(() => v.validateBorrowRequest({ ...base, borrow_date: '2026-11-01', due_date: '2026-11-03' }, NOW));
});

test('validateRole & validateProfileUpdate', () => {
  assert.equal(v.validateRole('admin'), 'admin');
  assert.equal(v.validateRole('superadmin'), 'superadmin');
  assert.equal(v.validateRole('user'), 'user');
  throwsBad(() => v.validateRole('root'), /role/);
  assert.deepEqual(v.validateProfileUpdate({ full_name: ' Ani ' }), { full_name: 'Ani' });
  throwsBad(() => v.validateProfileUpdate({}), /Tidak ada data/);
  throwsBad(() => v.validateProfileUpdate({ full_name: ' ' }), /kosong/);
  throwsBad(() => v.validateProfileUpdate({ avatar_url: 'javascript:alert(1)' }), /URL/);
});
