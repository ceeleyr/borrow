const { createMemoryRepositories } = require('../../src/repositories/memory');
const { createMemoryAuthProvider } = require('../../src/auth/memoryAuthProvider');
const { createLocalStorage } = require('../../src/storage/localStorage');
const { createApp } = require('../../src/app');
const os = require('os');
const path = require('path');
const fs = require('fs');

/** Jam palsu yang bisa digeser agar tes tanggal deterministik. */
function createClock(start = '2026-11-02T08:00:00.000Z') {
  let t = new Date(start).getTime();
  const clock = () => new Date(t);
  clock.advanceDays = (n) => {
    t += n * 24 * 60 * 60 * 1000;
  };
  return clock;
}

/** Rakit aplikasi lengkap di memori + helper untuk membuat admin/user. */
async function createTestContext() {
  const clock = createClock();
  const repos = createMemoryRepositories();
  const authProvider = createMemoryAuthProvider({ jwtSecret: 'test-secret' });
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'borrow-test-'));
  const storage = createLocalStorage(uploadDir);
  const { app, services } = createApp({ repos, authProvider, storage, clock });

  async function makeUser(name, { role = 'user' } = {}) {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.dev`;
    const created = await services.auth.register({ email, password: 'secret123', full_name: name });
    const user = role === 'admin' ? await repos.profiles.update(created.id, { role }) : created;
    const { access_token } = await services.auth.login({ email, password: 'secret123' });
    return { user, token: access_token, email };
  }

  return { clock, repos, authProvider, services, app, storage, uploadDir, makeUser };
}

/** Jalankan app Express di port acak dan kembalikan helper request. */
function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      async function request(method, url, { token, body, form } = {}) {
        const headers = {};
        if (token) headers.authorization = `Bearer ${token}`;
        let payload;
        if (form) payload = form;
        else if (body !== undefined) {
          headers['content-type'] = 'application/json';
          payload = typeof body === 'string' ? body : JSON.stringify(body);
        }
        const res = await fetch(base + url, { method, headers, body: payload });
        let json = null;
        try {
          json = await res.json();
        } catch {
          /* body kosong */
        }
        return { status: res.status, body: json };
      }
      resolve({ request, close: () => new Promise((r) => server.close(r)), base });
    });
  });
}

module.exports = { createClock, createTestContext, startServer };
