const { createClient } = require('@supabase/supabase-js');

const options = { auth: { autoRefreshToken: false, persistSession: false } };

/**
 * Dua client dengan peran berbeda:
 *  - admin: service role, untuk query DB, storage & admin.createUser. JANGAN pernah signInWithPassword di sini.
 *  - auth : anon key, khusus proses login.
 */
function createSupabaseClients({ url, serviceRoleKey, anonKey }) {
  return {
    adminClient: createClient(url, serviceRoleKey, options),
    authClient: createClient(url, anonKey, options),
  };
}

module.exports = { createSupabaseClients };
