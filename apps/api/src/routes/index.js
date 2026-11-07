const express = require('express');
const upload = require('../middlewares/upload.middleware');
const createAuthController = require('../controllers/auth.controller');
const createItemController = require('../controllers/item.controller');
const createBorrowController = require('../controllers/borrow.controller');
const createAdminController = require('../controllers/admin.controller');

/** Semua route didaftarkan di sini; hak akses dibaca sekali jalan dari atas ke bawah. */
function createRouter({ services, storage, mw }) {
  const { requireAuth, requireAdmin, requireUser } = mw;
  const router = express.Router();

  const authC = createAuthController(services);
  const itemC = createItemController(services, storage);
  const borrowC = createBorrowController(services);
  const adminC = createAdminController(services);

  // --- Auth ---
  router.post('/auth/register', authC.register);
  router.post('/auth/login', authC.login);
  router.get('/auth/me', requireAuth, authC.me);

  // --- Profil sendiri & manajemen user (admin) ---
  router.put('/users/me', requireAuth, authC.updateMe);
  router.get('/users', requireAuth, requireAdmin, adminC.listUsers);
  router.get('/users/:id', requireAuth, requireAdmin, adminC.getUser);

  // --- Barang: baca publik, kelola khusus admin ---
  router.get('/items', itemC.list);
  router.get('/items/:id', itemC.get);
  router.post('/items', requireAuth, requireAdmin, itemC.create);
  router.put('/items/:id', requireAuth, requireAdmin, itemC.update);
  router.delete('/items/:id', requireAuth, requireAdmin, itemC.remove);
  router.post('/items/:id/image', requireAuth, requireAdmin, upload.single('image'), itemC.uploadImage);

  // --- Peminjaman (anggota) ---
  router.post('/borrow-requests', requireAuth, requireUser, borrowC.create);
  router.get('/borrow-requests/mine', requireAuth, borrowC.mine);
  router.get('/borrow-requests/:id', requireAuth, borrowC.get);
  router.patch('/borrow-requests/:id/cancel', requireAuth, borrowC.cancel);

  // --- Admin ---
  const admin = express.Router();
  admin.use(requireAuth, requireAdmin);
  admin.get('/stats', adminC.stats);
  admin.get('/users', adminC.listUsers);
  admin.patch('/users/:id/role', adminC.setRole);
  admin.delete('/users/:id', adminC.deleteUser);
  admin.get('/borrow-requests', adminC.listRequests);
  admin.patch('/borrow-requests/:id/approve', adminC.approve);
  admin.patch('/borrow-requests/:id/reject', adminC.reject);
  admin.patch('/borrow-requests/:id/pickup', adminC.pickup);
  admin.patch('/borrow-requests/:id/return', adminC.returnItem);
  admin.patch('/borrow-requests/:id/cancel', adminC.cancel);
  router.use('/admin', admin);

  return router;
}

module.exports = { createRouter };
