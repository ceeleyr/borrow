const { conflict, unauthorized, notFound } = require('../lib/errors');
const { validateRegister, validateLogin, validateProfileUpdate } = require('../lib/validators');
const { ROLES } = require('../models/constants');

function createAuthService({ profiles, authProvider }) {
  return {
    async register(body) {
      const { email, password, full_name } = validateRegister(body);

      if (await profiles.findByEmail(email)) {
        throw conflict('Email sudah terdaftar', 'EMAIL_TAKEN');
      }

      const { id } = await authProvider.register(email, password);
      try {
        return await profiles.create({ id, email, full_name, role: ROLES.USER });
      } catch (err) {
        // Rollback agar tidak ada akun auth "yatim" tanpa profil
        await authProvider.deleteUser(id).catch(() => {});
        throw err;
      }
    },

    async login(body) {
      const { email, password } = validateLogin(body);
      const { userId, access_token } = await authProvider.login(email, password);
      const user = await profiles.findById(userId);
      if (!user) throw unauthorized('Profil pengguna tidak ditemukan');
      return { user, access_token };
    },

    /** Dipakai middleware: token -> profil terbaru (role selalu fresh dari DB). */
    async authenticate(token) {
      const userId = await authProvider.verifyToken(token);
      if (!userId) return null;
      return profiles.findById(userId);
    },

    async me(userId) {
      const user = await profiles.findById(userId);
      if (!user) throw notFound('Pengguna tidak ditemukan');
      return user;
    },

    async updateProfile(userId, body) {
      const patch = validateProfileUpdate(body);
      const user = await profiles.update(userId, patch);
      if (!user) throw notFound('Pengguna tidak ditemukan');
      return user;
    },
  };
}

module.exports = { createAuthService };
