const { load } = require('./config/env');
const { buildApp } = require('./bootstrap');
const { logger } = require('./lib/logger');

async function main() {
  const config = load();
  const built = buildApp(config);

  built.app.listen(config.port, '0.0.0.0', () => {
    logger.info('server started', { port: config.port, store: built.mode, logLevel: process.env.LOG_LEVEL || 'info' });
    if (built.mode === 'memory') {
      logger.warn('mode memory: data kosong dan hilang saat restart');
    }
  });
}

main().catch((err) => {
  logger.error('gagal start server', { err });
  process.exit(1);
});
