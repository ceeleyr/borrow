/**
 * Logger terstruktur (satu baris JSON per event) untuk memantau dan menelusuri masalah saat server berjalan.
 * Level diatur lewat LOG_LEVEL: debug | info | warn | error (default info).
 * Jangan pernah memasukkan header, token, atau body request ke dalam log.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

/** Saat dijalankan dari `node --test`, log dibisukan agar output tes tetap bersih. */
const defaultLevel = process.env.NODE_TEST_CONTEXT ? 'silent' : 'info';

function serializeMeta(meta = {}) {
  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;
  }
  return out;
}

function createLogger({ level = defaultLevel, sink = console, now = () => new Date().toISOString() } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function write(lvl, msg, meta) {
    if (LEVELS[lvl] < threshold) return;
    const line = JSON.stringify({ time: now(), level: lvl, msg, ...serializeMeta(meta) });
    if (lvl === 'error') sink.error(line);
    else if (lvl === 'warn') sink.warn(line);
    else sink.log(line);
  }

  return {
    debug: (msg, meta) => write('debug', msg, meta),
    info: (msg, meta) => write('info', msg, meta),
    warn: (msg, meta) => write('warn', msg, meta),
    error: (msg, meta) => write('error', msg, meta),
  };
}

/** Middleware Express: mencatat setiap request selesai (method, path, status, durasi). */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const meta = { method: req.method, path: req.originalUrl?.split('?')[0], status: res.statusCode, durationMs: Math.round(durationMs) };
      if (res.statusCode >= 500) logger.error('request', meta);
      else if (res.statusCode >= 400) logger.warn('request', meta);
      else logger.info('request', meta);
    });
    next();
  };
}

const logger = createLogger({ level: process.env.LOG_LEVEL || defaultLevel });

module.exports = { createLogger, requestLogger, logger, LEVELS };
