const { notFound, conflict, forbidden } = require('../lib/errors');
const { validateBorrowRequest, validateAdminNote } = require('../lib/validators');
const { canTransition, isOverdue, holdsStock } = require('../domain/borrowFlow');
const { BORROW_STATUS: S, ITEM_STATUS, ACTIVE_BORROW_STATUSES, ROLES } = require('../models/constants');

function createBorrowService({ borrows, items, clock = () => new Date() }) {
  const decorate = (r) => (r ? { ...r, is_overdue: isOverdue(r, clock()) } : r);
  const nowIso = () => clock().toISOString();

  async function mustFind(id) {
    const r = await borrows.findById(id);
    if (!r) throw notFound('Request not found');
    return r;
  }

  function assertTransition(action, request) {
    if (!canTransition(action, request.status)) {
      throw conflict(
        `Aksi "${action}" tidak bisa dilakukan pada request berstatus "${request.status}"`,
        'INVALID_TRANSITION'
      );
    }
  }

  async function restoreStock(request) {
    await items.adjustStock(request.item_id, request.quantity);
  }

  return {
    // ---------- Peminjam ----------
    async create(user, body) {
      const data = validateBorrowRequest(body, clock());

      const item = await items.findById(data.item_id);
      if (!item) throw notFound('Item not found');
      if (item.status === ITEM_STATUS.UNAVAILABLE || item.available_quantity <= 0) {
        throw conflict('Item sedang tidak tersedia', 'ITEM_UNAVAILABLE');
      }
      if (data.quantity > item.available_quantity) {
        throw conflict(`Stok tidak cukup. Tersedia: ${item.available_quantity}`, 'INSUFFICIENT_STOCK');
      }
      if (await borrows.exists({ item_id: item.id, borrower_id: user.id, status: ACTIVE_BORROW_STATUSES })) {
        throw conflict('Kamu masih punya pengajuan aktif untuk barang ini', 'DUPLICATE_REQUEST');
      }

      return decorate(await borrows.create({ ...data, borrower_id: user.id, requested_at: nowIso() }));
    },

    async listMine(userId, { status } = {}) {
      const rows = await borrows.list({ borrower_id: userId, status: status || undefined });
      return rows.map(decorate);
    },

    async get(actor, id) {
      const r = await mustFind(id);
      if (actor.role !== ROLES.ADMIN && r.borrower_id !== actor.id) {
        throw forbidden('Kamu tidak punya akses untuk request ini');
      }
      return decorate(r);
    },

    /** Peminjam membatalkan request pending-nya; admin boleh membatalkan pending/approved. */
    async cancel(actor, id, body) {
      const r = await mustFind(id);
      const isAdmin = actor.role === ROLES.ADMIN;

      if (!isAdmin) {
        if (r.borrower_id !== actor.id) throw forbidden('Kamu tidak punya akses untuk request ini');
        if (r.status !== S.PENDING) {
          throw conflict('Hanya request berstatus pending yang bisa dibatalkan', 'INVALID_TRANSITION');
        }
      }
      assertTransition('cancel', r);

      const updated = await borrows.transition(id, [r.status], {
        status: S.CANCELLED,
        cancelled_at: nowIso(),
        admin_note: isAdmin ? validateAdminNote(body) : r.admin_note,
      });
      if (!updated) throw conflict('Request sudah berubah, muat ulang data', 'STALE');
      if (holdsStock(r.status)) await restoreStock(r);
      return decorate(updated);
    },

    // ---------- Admin ----------
    async listAll({ status, search } = {}) {
      let rows = await borrows.list({ status: status || undefined });
      const q = search ? String(search).trim().toLowerCase() : '';
      if (q) {
        rows = rows.filter(
          (r) =>
            r.item?.name?.toLowerCase().includes(q) ||
            r.borrower?.full_name?.toLowerCase().includes(q) ||
            r.borrower?.email?.toLowerCase().includes(q)
        );
      }
      return rows.map(decorate);
    },

    async approve(admin, id, body) {
      const r = await mustFind(id);
      assertTransition('approve', r);

      const item = await items.findById(r.item_id);
      if (!item) throw notFound('Item not found');
      if (item.status === ITEM_STATUS.UNAVAILABLE) {
        throw conflict('Item sedang dinonaktifkan, tidak bisa disetujui', 'ITEM_UNAVAILABLE');
      }

      // Tahan stok dulu (atomik); kalau gagal berarti stok tidak cukup.
      const reserved = await items.adjustStock(r.item_id, -r.quantity);
      if (!reserved) throw conflict('Stok tidak mencukupi untuk menyetujui request ini', 'INSUFFICIENT_STOCK');

      const updated = await borrows.transition(id, [S.PENDING], {
        status: S.APPROVED,
        approved_at: nowIso(),
        approved_by: admin.id,
        admin_note: validateAdminNote(body),
      });
      if (!updated) {
        await restoreStock(r); // request diproses pihak lain di saat yang sama
        throw conflict('Request ini sudah diproses sebelumnya', 'INVALID_TRANSITION');
      }
      return decorate(updated);
    },

    async reject(admin, id, body) {
      const r = await mustFind(id);
      assertTransition('reject', r);
      const updated = await borrows.transition(id, [S.PENDING], {
        status: S.REJECTED,
        rejected_at: nowIso(),
        approved_by: admin.id,
        admin_note: validateAdminNote(body),
      });
      if (!updated) throw conflict('Request ini sudah diproses sebelumnya', 'INVALID_TRANSITION');
      return decorate(updated);
    },

    /** Peminjam datang mengambil barang -> status "borrowed". */
    async pickup(admin, id) {
      const r = await mustFind(id);
      assertTransition('pickup', r);
      const updated = await borrows.transition(id, [S.APPROVED], {
        status: S.BORROWED,
        picked_up_at: nowIso(),
      });
      if (!updated) throw conflict('Request sudah berubah, muat ulang data', 'STALE');
      return decorate(updated);
    },

    /** Barang dikembalikan -> status "returned" dan stok bertambah. */
    async returnItem(admin, id, body) {
      const r = await mustFind(id);
      assertTransition('return', r);
      const updated = await borrows.transition(id, [S.BORROWED], {
        status: S.RETURNED,
        returned_at: nowIso(),
        admin_note: validateAdminNote(body) ?? r.admin_note,
      });
      if (!updated) throw conflict('Request sudah berubah, muat ulang data', 'STALE');
      await restoreStock(r);
      return decorate(updated);
    },
  };
}

module.exports = { createBorrowService };
