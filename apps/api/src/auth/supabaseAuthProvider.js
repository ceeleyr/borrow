const { unauthorized, badRequest, conflict } = require('../lib/errors');

/**
 * Auth provider berbasis Supabase Auth.
 * `adminClient` (service role) -> createUser/deleteUser/getUser.
 * `authClient` (anon key)      -> signInWithPassword. Dipisah agar sesi login tidak
 *                                 "mencemari" client admin.
 */
function createSupabaseAuthProvider({ adminClient, authClient }) {
  return {
    async register(email, password) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          throw conflict('Email sudah terdaftar', 'EMAIL_TAKEN');
        }
        throw badRequest(error.message);
      }
      return { id: data.user.id };
    },
    async login(email, password) {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error || !data?.session) throw unauthorized('Email atau password salah');
      return { userId: data.user.id, access_token: data.session.access_token };
    },
    async verifyToken(token) {
      const { data, error } = await adminClient.auth.getUser(token);
      if (error || !data?.user) return null;
      return data.user.id;
    },
    async deleteUser(id) {
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);
    },
  };
}

module.exports = { createSupabaseAuthProvider };
