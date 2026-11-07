const { load } = require('./config/env');
const { buildApp } = require('./bootstrap');
const { seedDemo, DEMO_ACCOUNTS, DEMO_PASSWORD } = require('./seed');

async function main() {
  const config = load();
  const built = buildApp(config);

  if (built.mode === 'memory' && config.seedDemo) {
    await seedDemo(built);
  }

  built.app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server jalan di http://localhost:${config.port}  [store: ${built.mode}]`);
    if (built.mode === 'memory') {
      console.log('Mode DEMO (data hilang saat restart). Akun contoh:');
      for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(5)} ${a.email} / ${DEMO_PASSWORD}`);
    }
  });
}

main().catch((err) => {
  console.error('Gagal start server:', err.message);
  process.exit(1);
});
