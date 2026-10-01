const express = require('express');
const router = express.Router();
const {
  getAllItemsAdmin,
  getAllUsersAdmin,
  approveItem,
  rejectItem,
  deleteItemAdmin,
  deleteUserAdmin,
  getAllBorrowRequestsAdmin,
  approveRequestAdmin,
  rejectRequestAdmin,
  getStats,
} = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireAdmin); // semua route di bawah ini wajib admin

router.get('/items', getAllItemsAdmin);
router.patch('/items/:id/approve', approveItem);
router.patch('/items/:id/reject', rejectItem);
router.delete('/items/:id', deleteItemAdmin);

router.get('/users', getAllUsersAdmin);
router.delete('/users/:id', deleteUserAdmin);

router.get('/borrow-requests', getAllBorrowRequestsAdmin);
router.patch('/borrow-requests/:id/approve', approveRequestAdmin);
router.patch('/borrow-requests/:id/reject', rejectRequestAdmin);

router.get('/stats', getStats);

module.exports = router;