const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidDateString, diffDays, addDays, toDateString } = require('../../src/lib/dates');

test('isValidDateString', () => {
  assert.equal(isValidDateString('2026-11-02'), true);
  assert.equal(isValidDateString('2028-02-29'), true); // kabisat
  assert.equal(isValidDateString('2027-02-29'), false);
  assert.equal(isValidDateString('2026-13-01'), false);
  assert.equal(isValidDateString('02-11-2026'), false);
  assert.equal(isValidDateString('2026-11-2'), false);
  assert.equal(isValidDateString(20261102), false);
  assert.equal(isValidDateString(null), false);
});

test('diffDays & addDays lintas bulan/tahun', () => {
  assert.equal(diffDays('2026-11-02', '2026-11-05'), 3);
  assert.equal(diffDays('2026-12-30', '2027-01-02'), 3);
  assert.equal(diffDays('2026-11-05', '2026-11-02'), -3);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(toDateString(new Date('2026-11-02T23:59:59Z')), '2026-11-02');
});
