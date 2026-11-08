const { unauthorized, forbidden } = require('../lib/errors');
const { ROLES } = require('../models/constants');

function createAuthMiddleware(authService) {
  async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized('Token tidak ditemukan');
    }
    const user = await authService.authenticate(header.slice(7).trim());
    if (!user) throw unauthorized('Token tidak valid');
    req.user = user;
    next();
  }

  const requireRole = (role, message) => (req, res, next) => {
    if (!req.user || req.user.role !== role) throw forbidden(message);
    next();
  };

  return {
    requireAuth,
    requireAdmin: (req, res, next) => {
      if (!req.user || (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPERADMIN)) {
        throw forbidden('Akses khusus admin');
      }
      next();
    },
    requireSuperAdmin: requireRole(ROLES.SUPERADMIN, 'Akses khusus superadmin (kelola user)'),
    requireUser: requireRole(ROLES.USER, 'Fitur ini khusus anggota (user)'),
  };
}

module.exports = { createAuthMiddleware };
