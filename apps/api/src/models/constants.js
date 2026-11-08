const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin', SUPERADMIN: 'superadmin' });

const ITEM_STATUS = Object.freeze({
  AVAILABLE: 'available',
  BORROWED: 'borrowed', // seluruh stok sedang dipinjam (otomatis)
  UNAVAILABLE: 'unavailable', // dinonaktifkan manual oleh admin
});

const ITEM_CONDITIONS = Object.freeze(['good', 'fair', 'poor']);

const BORROW_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  BORROWED: 'borrowed',
  RETURNED: 'returned',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

// Status yang masih "hidup" (menahan stok / belum selesai)
const ACTIVE_BORROW_STATUSES = Object.freeze([
  BORROW_STATUS.PENDING,
  BORROW_STATUS.APPROVED,
  BORROW_STATUS.BORROWED,
]);

const MAX_LOAN_DAYS = 30;

module.exports = {
  ROLES,
  ITEM_STATUS,
  ITEM_CONDITIONS,
  BORROW_STATUS,
  ACTIVE_BORROW_STATUSES,
  MAX_LOAN_DAYS,
};
