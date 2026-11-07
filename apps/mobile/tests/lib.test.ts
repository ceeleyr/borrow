import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, diffDays, formatDate, formatDateTime, isValidDateString, todayString, validateLoanDates } from '../src/lib/dates.ts';
import { ACTION_LABEL, availableActions, borrowLabel, borrowTone, itemStatusInfo, BORROW_STATUSES } from '../src/lib/status.ts';
import { validateBorrowForm, validateItemForm, validateLoginForm, validateRegisterForm } from '../src/lib/validation.ts';
import { resolveApiBaseUrl } from '../src/lib/api-url.ts';
import { getErrorMessage } from '../src/lib/errors.ts';

test('dates: todayString memakai tanggal lokal, addDays/diffDays', () => {
  assert.equal(todayString(new Date(2026, 10, 4, 23, 59)), '2026-11-04');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(diffDays('2026-11-01', '2026-11-04'), 3);
  assert.equal(isValidDateString('2027-02-29'), false);
  assert.equal(isValidDateString('2028-02-29'), true);
});

test('dates: format tampilan', () => {
  assert.equal(formatDate('2026-11-03'), '3 Nov 2026');
  assert.equal(formatDate('2026-08-17T10:00:00Z'), '17 Agu 2026');
  assert.equal(formatDate(null), '-');
  assert.equal(formatDate('ngawur'), '-');
  assert.equal(formatDateTime(null), '-');
  assert.match(formatDateTime(new Date(2026, 10, 3, 9, 5).toISOString()), /^3 Nov 2026, 09:05$/);
});

test('dates: validateLoanDates', () => {
  const today = '2026-11-04';
  assert.equal(validateLoanDates('2026-11-04', '2026-11-07', today), null);
  assert.match(validateLoanDates('2026-11-03', '2026-11-07', today)!, /masa lalu/);
  assert.match(validateLoanDates('2026-11-05', '2026-11-04', today)!, /sebelum/);
  assert.match(validateLoanDates('2026-11-04', '2026-12-30', today)!, /maksimal 30/);
  assert.match(validateLoanDates('besok', '2026-11-07', today)!, /YYYY-MM-DD/);
  assert.equal(validateLoanDates('2026-11-04', '2026-12-04', today), null); // tepat 30 hari
});

test('status: aksi yang tersedia per role & status', () => {
  assert.deepEqual(availableActions('admin', 'pending'), ['approve', 'reject']);
  assert.deepEqual(availableActions('admin', 'approved'), ['pickup', 'cancel']);
  assert.deepEqual(availableActions('admin', 'borrowed'), ['return']);
  for (const s of ['returned', 'rejected', 'cancelled'] as const) {
    assert.deepEqual(availableActions('admin', s), []);
    assert.deepEqual(availableActions('user', s), []);
  }
  assert.deepEqual(availableActions('user', 'pending'), ['cancel']);
  assert.deepEqual(availableActions('user', 'approved'), []);
  assert.deepEqual(availableActions('user', 'borrowed'), []);
  for (const s of BORROW_STATUSES) for (const a of availableActions('admin', s)) assert.ok(ACTION_LABEL[a]);
});

test('status: label & tone, termasuk overdue', () => {
  assert.equal(borrowLabel('borrowed'), 'Dipinjam');
  assert.equal(borrowLabel('borrowed', true), 'Terlambat');
  assert.equal(borrowTone('borrowed', true), 'danger');
  assert.equal(borrowTone('returned'), 'success');
  assert.equal(borrowTone('pending'), 'warning');
  assert.equal(borrowTone('cancelled'), 'neutral');
});

test('status: itemStatusInfo', () => {
  assert.deepEqual(itemStatusInfo({ status: 'available', available_quantity: 2, quantity: 2 }), { label: 'Tersedia', tone: 'success', canBorrow: true });
  assert.equal(itemStatusInfo({ status: 'borrowed', available_quantity: 0, quantity: 2 }).canBorrow, false);
  assert.equal(itemStatusInfo({ status: 'unavailable', available_quantity: 2, quantity: 2 }).label, 'Tidak tersedia');
});

test('validation: login & register', () => {
  assert.deepEqual(validateLoginForm({ email: 'a@b.co', password: 'x' }), {});
  assert.ok(validateLoginForm({ email: '', password: '' }).email);
  assert.ok(validateLoginForm({ email: 'salah', password: 'x' }).email);
  assert.ok(validateLoginForm({ email: 'a@b.co', password: '' }).password);
  assert.deepEqual(validateRegisterForm({ fullName: 'A', email: 'a@b.co', password: '123456' }), {});
  const e = validateRegisterForm({ fullName: ' ', email: 'x', password: '123' });
  assert.ok(e.fullName && e.email && e.password);
});

test('validation: form barang menghasilkan payload bersih', () => {
  const base = { name: ' Bor ', description: ' ', category: 'Alat', condition: 'good' as const, quantity: '3', imageUrl: '', unavailable: false };
  const ok = validateItemForm(base);
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.payload, { name: 'Bor', description: null, category: 'Alat', condition: 'good', quantity: 3, image_url: null, status: 'available' });
  assert.equal(validateItemForm({ ...base, unavailable: true }).payload?.status, 'unavailable');
  assert.ok(validateItemForm({ ...base, name: '' }).errors.name);
  for (const q of ['0', '-1', '1.5', 'abc', '']) assert.ok(validateItemForm({ ...base, quantity: q }).errors.quantity, `qty ${q}`);
  assert.ok(validateItemForm({ ...base, imageUrl: 'ftp://x' }).errors.imageUrl);
  assert.equal(validateItemForm({ ...base, imageUrl: 'https://a.co/x.png' }).payload?.image_url, 'https://a.co/x.png');
  assert.equal(validateItemForm({ ...base, name: '' }).payload, null);
});

test('validation: form pinjam', () => {
  const v = { quantity: 1, maxQuantity: 2, borrowDate: '2026-11-04', dueDate: '2026-11-06', today: '2026-11-04' };
  assert.equal(validateBorrowForm(v), null);
  assert.match(validateBorrowForm({ ...v, quantity: 3 })!, /hanya 2/);
  assert.match(validateBorrowForm({ ...v, quantity: 0 })!, /minimal 1/);
  assert.match(validateBorrowForm({ ...v, dueDate: '2026-11-01' })!, /sebelum/);
  assert.match(validateBorrowForm({ ...v, dueDate: 'x' })!, /YYYY-MM-DD/);
});

test('api-url: urutan prioritas', () => {
  assert.equal(resolveApiBaseUrl({ envUrl: 'https://api.x.com/', platform: 'ios' }), 'https://api.x.com/api');
  assert.equal(resolveApiBaseUrl({ envUrl: 'https://api.x.com/api', platform: 'ios' }), 'https://api.x.com/api');
  assert.equal(resolveApiBaseUrl({ platform: 'web', webHostname: '192.168.1.9' }), 'http://192.168.1.9:3000/api');
  assert.equal(resolveApiBaseUrl({ platform: 'web' }), 'http://localhost:3000/api');
  assert.equal(resolveApiBaseUrl({ platform: 'ios', hostUri: '192.168.1.5:8081' }), 'http://192.168.1.5:3000/api');
  assert.equal(resolveApiBaseUrl({ platform: 'android', hostUri: 'localhost:8081' }), 'http://10.0.2.2:3000/api');
  assert.equal(resolveApiBaseUrl({ platform: 'ios' }), 'http://localhost:3000/api');
});

test('errors: getErrorMessage', () => {
  assert.equal(getErrorMessage({ response: { data: { message: 'Email sudah terdaftar' } } }), 'Email sudah terdaftar');
  assert.match(getErrorMessage({ code: 'ERR_NETWORK' }), /terhubung/);
  assert.match(getErrorMessage({ message: 'Network Error' }), /terhubung/);
  assert.match(getErrorMessage({ code: 'ECONNABORTED' }), /timeout/);
  assert.equal(getErrorMessage(new Error('x'), 'Gagal'), 'Gagal');
  assert.equal(getErrorMessage(undefined), 'Terjadi kesalahan');
});
