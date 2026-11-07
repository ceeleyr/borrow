const crypto = require('crypto');
const { createApp } = require('./app');
const { createMemoryRepositories } = require('./repositories/memory');
const { createMemoryAuthProvider } = require('./auth/memoryAuthProvider');
const { createLocalStorage } = require('./storage/localStorage');

/** Rakit aplikasi sesuai config (supabase atau memory). */
function buildApp(config, overrides = {}) {
  if (config.dataStore === 'supabase') {
    // require lazy: mode memory tidak butuh paket/credential Supabase sama sekali
    const { createSupabaseClients } = require('./config/supabase');
    const { createSupabaseRepositories } = require('./repositories/supabase');
    const { createSupabaseAuthProvider } = require('./auth/supabaseAuthProvider');
    const { createSupabaseStorage } = require('./storage/supabaseStorage');

    const { adminClient, authClient } = createSupabaseClients(config.supabase);
    return {
      mode: 'supabase',
      ...createApp({
        repos: createSupabaseRepositories(adminClient),
        authProvider: createSupabaseAuthProvider({ adminClient, authClient }),
        storage: createSupabaseStorage(adminClient),
        ...overrides,
      }),
    };
  }

  const repos = createMemoryRepositories();
  const authProvider = createMemoryAuthProvider({
    jwtSecret: config.jwtSecret || crypto.randomBytes(32).toString('hex'),
  });
  const built = createApp({
    repos,
    authProvider,
    storage: createLocalStorage(config.uploadDir),
    ...overrides,
  });
  return { mode: 'memory', repos, authProvider, ...built };
}

module.exports = { buildApp };
