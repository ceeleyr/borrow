const { load } = require('./config/env');
const { buildApp } = require('./bootstrap');

async function main() {
  const config = load();
  const built = buildApp(config);

  built.app.listen(config.port, '0.0.0.0', () => {
    console.log(`Server jalan di http://localhost:${config.port}  [store: ${built.mode}]`);
    if (built.mode === 'memory') {
      console.log('Mode memory: data kosong dan hilang saat restart.');
    }
  });
}

main().catch((err) => {
  console.error('Gagal start server:', err.message);
  process.exit(1);
});