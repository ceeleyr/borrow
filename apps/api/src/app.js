const express = require('express');
const cors = require('cors');
const { createServices } = require('./services');
const { createAuthMiddleware } = require('./middlewares/auth.middleware');
const { createRouter } = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

/**
 * Factory aplikasi Express. Semua dependensi (repo, auth, storage) di-inject sehingga
 * app bisa dijalankan dengan Supabase (produksi) maupun in-memory (demo & test).
 */
function createApp({ repos, authProvider, storage, clock }) {
  const services = createServices({ repos, authProvider, clock });
  const mw = createAuthMiddleware(services.auth);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));
  if (storage?.dir) app.use('/uploads', express.static(storage.dir));

  app.use('/api', createRouter({ services, storage, mw }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, services };
}

module.exports = { createApp };
