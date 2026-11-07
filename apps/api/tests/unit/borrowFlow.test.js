const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransition, getTransition, isOverdue, deriveItemStatus, holdsStock } = require('../../src/domain/borrowFlow');

test('alur normal: pending -> approved -> borrowed -> returned', () => {
  assert.equal(canTransition('approve', 'pending'), true);
  assert.equal(canTransition('pickup', 'approved'), true);
  assert.equal(canTransition('return', 'borrowed'), true);
  assert.equal(getTransition('approve').to, 'approved');
  assert.equal(getTransition('pickup').to, 'borrowed');
  assert.equal(getTransition('return').to, 'returned');
});

test('alur ditolak: hanya dari pending', () => {
  assert.equal(canTransition('reject', 'pending'), true);
  for (const s of ['approved', 'borrowed', 'returned', 'rejected', 'cancelled']) {
    assert.equal(canTransition('reject', s), false, `reject dari ${s}`);
  }
});

test('tidak boleh lompat tahap', () => {
  assert.equal(canTransition('pickup', 'pending'), false);
  assert.equal(canTransition('return', 'approved'), false);
  assert.equal(canTransition('return', 'pending'), false);
  assert.equal(canTransition('approve', 'approved'), false);
});

test('status final tidak bisa diubah lagi', () => {
  for (const s of ['returned', 'rejected', 'cancelled']) {
    for (const a of ['approve', 'reject', 'pickup', 'return', 'cancel']) {
      assert.equal(canTransition(a, s), false, `${a} dari ${s}`);
    }
  }
});

test('cancel hanya dari pending atau approved', () => {
  assert.equal(canTransition('cancel', 'pending'), true);
  assert.equal(canTransition('cancel', 'approved'), true);
  assert.equal(canTransition('cancel', 'borrowed'), false);
});

test('aksi tidak dikenal -> error / false', () => {
  assert.equal(canTransition('hack', 'pending'), false);
  assert.throws(() => getTransition('hack'), /tidak dikenal/);
});

test('isOverdue: hanya status borrowed yang lewat due_date', () => {
  const now = new Date('2026-11-02T10:00:00Z');
  assert.equal(isOverdue({ status: 'borrowed', due_date: '2026-11-01' }, now), true);
  assert.equal(isOverdue({ status: 'borrowed', due_date: '2026-11-02' }, now), false); // jatuh tempo hari ini belum telat
  assert.equal(isOverdue({ status: 'borrowed', due_date: '2026-11-05' }, now), false);
  assert.equal(isOverdue({ status: 'returned', due_date: '2026-10-01' }, now), false);
  assert.equal(isOverdue({ status: 'pending', due_date: '2026-10-01' }, now), false);
  assert.equal(isOverdue(null, now), false);
});

test('deriveItemStatus mengikuti stok, kecuali unavailable', () => {
  assert.equal(deriveItemStatus({ status: 'available', available_quantity: 2 }), 'available');
  assert.equal(deriveItemStatus({ status: 'available', available_quantity: 0 }), 'borrowed');
  assert.equal(deriveItemStatus({ status: 'borrowed', available_quantity: 1 }), 'available');
  assert.equal(deriveItemStatus({ status: 'unavailable', available_quantity: 5 }), 'unavailable');
});

test('holdsStock: approved & borrowed menahan stok', () => {
  assert.equal(holdsStock('approved'), true);
  assert.equal(holdsStock('borrowed'), true);
  assert.equal(holdsStock('pending'), false);
  assert.equal(holdsStock('returned'), false);
});
