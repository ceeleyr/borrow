const express = require('express');
const router = express.Router();
const {
  createBorrowRequest,
  getMyRequests,
  getReceivedRequests,
  approveRequest,
  rejectRequest,
  returnItem,
} = require('../controllers/borrow.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/', requireAuth, createBorrowRequest);
router.get('/mine', requireAuth, getMyRequests);
router.get('/received', requireAuth, getReceivedRequests);
router.patch('/:id/approve', requireAuth, approveRequest);
router.patch('/:id/reject', requireAuth, rejectRequest);
router.patch('/:id/return', requireAuth, returnItem);

module.exports = router;