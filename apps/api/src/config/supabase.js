const { createClient } = require('@supabase/supabase-js');
const { supabase: supabaseConfig } = require('./env');

// Admin client: khusus query DB & admin.createUser. JANGAN PERNAH panggil signInWithPassword di sini.
const supabaseAdmin = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Auth client: khusus buat proses login. Terpisah total dari admin client.
const supabaseAuth = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabaseAdmin, supabaseAuth };