require('dotenv').config();
const path = require('path');

const env = process.env;
const args = process.argv.slice(2);

const hasSupabaseCreds = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_ANON_KEY);

/**
 * DATA_STORE:
 *  - "supabase": produksi, butuh SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY
 *  - "memory"  : demo & test, tanpa dependensi eksternal (data hilang saat restart)
 * Default: supabase bila kredensial lengkap, selain itu memory. Flag `--memory` memaksa mode demo.
 */
function resolveDataStore() {
  if (args.includes('--memory') || env.DATA_STORE === 'memory') return 'memory';
  if (env.DATA_STORE === 'supabase') {
    if (!hasSupabaseCreds) {
      throw new Error('DATA_STORE=supabase tetapi SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY belum lengkap');
    }
    return 'supabase';
  }
  return hasSupabaseCreds ? 'supabase' : 'memory';
}

function load() {
  const dataStore = resolveDataStore();
  return {
    port: Number(env.PORT) || 3000,
    dataStore,
    seedDemo: env.SEED_DEMO !== 'false',
    jwtSecret: env.JWT_SECRET, // hanya dipakai mode memory
    uploadDir: env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    supabase: {
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: env.SUPABASE_ANON_KEY,
    },
  };
}

module.exports = { load };
