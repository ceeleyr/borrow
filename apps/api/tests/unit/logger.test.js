const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createLogger, requestLogger } = require('../../src/lib/logger');

function captureSink() {
  const lines = { log: [], warn: [], error: [] };
  return {
    lines,
    sink: {
      log: (l) => lines.log.push(JSON.parse(l)),
      warn: (l) => lines.warn.push(JSON.parse(l)),
      error: (l) => lines.error.push(JSON.parse(l)),
    },
  };
}

test('logger: menulis JSON per baris dengan level, waktu, dan meta', () => {
  const { lines, sink } = captureSink();
  const log = createLogger({ level: 'info', sink, now: () => '2026-11-19T00:00:00.000Z' });
  log.info('server started', { port: 3000 });
  assert.deepEqual(lines.log, [{ time: '2026-11-19T00:00:00.000Z', level: 'info', msg: 'server started', port: 3000 }]);
});

test('logger: level di bawah ambang diabaikan', () => {
  const { lines, sink } = captureSink();
  const log = createLogger({ level: 'warn', sink });
  log.debug('rinci');
  log.info('biasa');
  log.warn('perhatian');
  log.error('gagal');
  assert.equal(lines.log.length, 0);
  assert.equal(lines.warn.length, 1);
  assert.equal(lines.error.length, 1);
});

test('logger: error diserialisasi (nama, pesan, stack)', () => {
  const { lines, sink } = captureSink();
  const log = createLogger({ level: 'error', sink });
  log.error('unhandled error', { err: new TypeError('boom') });
  const [entry] = lines.error;
  assert.equal(entry.err.name, 'TypeError');
  assert.equal(entry.err.message, 'boom');
  assert.ok(entry.err.stack.includes('TypeError'));
});

test('logger: level silent membisukan semua output', () => {
  const { lines, sink } = captureSink();
  const log = createLogger({ level: 'silent', sink });
  log.error('tetap diam');
  assert.equal(lines.error.length, 0);
});

test('requestLogger: mencatat method, path tanpa query, status, dan durasi saat response selesai', () => {
  const { lines, sink } = captureSink();
  const log = createLogger({ level: 'info', sink });
  const mw = requestLogger(log);

  const req = { method: 'GET', originalUrl: '/api/items?search=bor' };
  const res = new EventEmitter();
  res.statusCode = 200;
  let nextCalled = false;
  mw(req, res, () => (nextCalled = true));
  assert.equal(nextCalled, true);
  res.emit('finish');

  const [entry] = lines.log;
  assert.equal(entry.msg, 'request');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.path, '/api/items');
  assert.equal(entry.status, 200);
  assert.equal(typeof entry.durationMs, 'number');
  assert.equal('authorization' in entry, false);
});

test('requestLogger: status 4xx ke warn, 5xx ke error', () => {
  const { lines, sink } = captureSink();
  const log = createLogger({ level: 'info', sink });
  const mw = requestLogger(log);

  for (const status of [404, 500]) {
    const res = new EventEmitter();
    res.statusCode = status;
    mw({ method: 'POST', originalUrl: '/api/x' }, res, () => {});
    res.emit('finish');
  }
  assert.equal(lines.warn[0].status, 404);
  assert.equal(lines.error[0].status, 500);
});
