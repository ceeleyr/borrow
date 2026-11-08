/**
 * Buat akun admin / superadmin (atau promosikan akun yang sudah ada) di Supabase.
 * Pemakaian:  node scripts/create-admin.js email@domain.com password "Nama Lengkap" [admin|superadmin]
 */
const { load } = require('../src/config/env');
const { buildApp } = require('../src/bootstrap');

async function main() {
  const rawArgs = process.argv.slice(2);
  const isSuper = rawArgs.includes('--super') || rawArgs.includes('--superadmin');
  const args = rawArgs.filter((a) => !a.startsWith('--'));
  const [email, password, fullName = isSuper ? 'Super Admin' : 'Admin', customRole] = args;

  if (!email || !password) {
    console.error('Pemakaian: node scripts/create-admin.js <email> <password> ["Nama Lengkap"] [admin|superadmin]');
    process.exit(1);
  }
  const role = isSuper ? 'superadmin' : (customRole === 'superadmin' ? 'superadmin' : 'admin');
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
  await repos.profiles.update(profile.id, { role });
  console.log(`OK (${mode}): ${email} sekarang ${role}`);
}

main().catch((e) => {
  console.error('Gagal:', e.message);
  process.exit(1);
});
