// Entry point untuk Vercel (serverless). Vercel memanggil app Express per request, jadi tidak ada app.listen().
// Untuk jalan lokal gunakan src/index.js (npm run start).
const { load } = require('../src/config/env');
const { buildApp } = require('../src/bootstrap');

module.exports = buildApp(load()).app;
