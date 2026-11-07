const { BORROW_STATUS: S, ITEM_STATUS } = require('../models/constants');
const { toDateString } = require('../lib/dates');

/**
 * State machine peminjaman (murni, tanpa I/O):
 *
 *   pending --approve--> approved --pickup--> borrowed --return--> returned
 *      |  \                  |
 *      |   \--reject--> rejected
 *      |-- cancel (peminjam/admin) --> cancelled <-- cancel (admin) -- approved
 */
const TRANSITIONS = Object.freeze({
  approve: { from: [S.PENDING], to: S.APPROVED },
  reject: { from: [S.PENDING], to: S.REJECTED },
  pickup: { from: [S.APPROVED], to: S.BORROWED },
  return: { from: [S.BORROWED], to: S.RETURNED },
  cancel: { from: [S.PENDING, S.APPROVED], to: S.CANCELLED },
});

// Aksi yang menahan stok (dikurangi saat approve)
const RESERVED_STATUSES = Object.freeze([S.APPROVED, S.BORROWED]);

function canTransition(action, status) {
  const t = TRANSITIONS[action];
  return Boolean(t && t.from.includes(status));
}

function getTransition(action) {
  const t = TRANSITIONS[action];
  if (!t) throw new Error(`Aksi tidak dikenal: ${action}`);
  return t;
}

/** Barang sedang dipinjam tapi sudah lewat rencana tanggal kembali. */
function isOverdue(request, now = new Date()) {
  if (!request || request.status !== S.BORROWED) return false;
  return request.due_date < toDateString(now);
}

/** Status barang diturunkan dari stok, kecuali admin menonaktifkannya. */
function deriveItemStatus({ status, available_quantity }) {
  if (status === ITEM_STATUS.UNAVAILABLE) return ITEM_STATUS.UNAVAILABLE;
  return available_quantity > 0 ? ITEM_STATUS.AVAILABLE : ITEM_STATUS.BORROWED;
}

function holdsStock(status) {
  return RESERVED_STATUSES.includes(status);
}

module.exports = {
  TRANSITIONS,
  canTransition,
  getTransition,
  isOverdue,
  deriveItemStatus,
  holdsStock,
};
