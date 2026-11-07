const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { unauthorized, conflict } = require('../lib/errors');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/**
 * Auth provider lokal (email+password+JWT) untuk mode demo/test.
 * Kontrak sama dengan supabaseAuthProvider.
 */
function createMemoryAuthProvider({ jwtSecret, tokenTtl = '7d' } = {}) {
  if (!jwtSecret) throw new Error('jwtSecret wajib diisi');
  const credentials = new Map(); // email -> { id, passwordHash }

  return {
    async register(email, password) {
      const key = email.toLowerCase();
      if (credentials.has(key)) throw conflict('Email sudah terdaftar', 'EMAIL_TAKEN');
      const id = crypto.randomUUID();
      credentials.set(key, { id, passwordHash: hashPassword(password) });
      return { id };
    },
    async login(email, password) {
      const cred = credentials.get(email.toLowerCase());
      if (!cred || !verifyPassword(password, cred.passwordHash)) {
        throw unauthorized('Email atau password salah');
      }
      const access_token = jwt.sign({ sub: cred.id }, jwtSecret, { expiresIn: tokenTtl });
      return { userId: cred.id, access_token };
    },
    async verifyToken(token) {
      try {
        const payload = jwt.verify(token, jwtSecret);
        return payload.sub || null;
      } catch {
        return null;
      }
    },
    async deleteUser(id) {
      for (const [email, cred] of credentials) {
        if (cred.id === id) credentials.delete(email);
      }
    },
  };
}

module.exports = { createMemoryAuthProvider };
