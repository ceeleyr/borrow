/**
 * Buat akun admin (atau promosikan akun yang sudah ada) di Supabase.
 * Pemakaian:  node scripts/create-admin.js email@domain.com password "Nama Lengkap"
 */
const { load } = require('../src/config/env');
const { buildApp } = require('../src/bootstrap');

async function main() {
  const [email, password, fullName = 'Admin'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!email || !password) {
    console.error('Pemakaian: node scripts/create-admin.js <email> <password> ["Nama Lengkap"]');
    process.exit(1);
  }
  const config = load();
  if (config.dataStore !== 'supabase') {
    console.error('Script ini hanya untuk mode Supabase (isi .env terlebih dahulu).');
    process.exit(1);
  }
  const { services, mode } = buildApp(config);
  const { createSupabaseClients } = require('../src/config/supabase');
  const { createSupabaseRepositories } = require('../src/repositories/supabase');
  const repos = createSupabaseRepositories(createSupabaseClients(config.supabase).adminClient);

  let profile = await repos.profiles.findByEmail(email.toLowerCase());
  if (!profile) profile = await services.auth.register({ email, password, full_name: fullName });
  await repos.profiles.update(profile.id, { role: 'admin' });
  console.log(`OK (${mode}): ${email} sekarang admin`);
}

main().catch((e) => {
  console.error('Gagal:', e.message);
  process.exit(1);
});
