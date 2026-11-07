const { notFound, conflict, badRequest } = require('../lib/errors');
const { validateRole } = require('../lib/validators');
const { isOverdue } = require('../domain/borrowFlow');
const { BORROW_STATUS: S, ITEM_STATUS } = require('../models/constants');

function createAdminService({ profiles, items, borrows, authProvider, clock = () => new Date() }) {
  return {
    async stats() {
      const [totalUsers, totalItems, availableItems, totalRequests, pendingRequests, awaitingPickup, activeBorrows, borrowed] =
        await Promise.all([
          profiles.count(),
          items.count(),
          items.count({ status: ITEM_STATUS.AVAILABLE }),
          borrows.count(),
          borrows.count({ status: S.PENDING }),
          borrows.count({ status: S.APPROVED }),
          borrows.count({ status: S.BORROWED }),
          borrows.list({ status: S.BORROWED }),
        ]);

      const overdue = borrowed.filter((r) => isOverdue(r, clock())).length;
      return {
        totalUsers,
        totalItems,
        availableItems,
        totalRequests,
        pendingRequests,
        awaitingPickup,
        activeBorrows,
        overdue,
      };
    },

    listUsers: () => profiles.list(),

    async getUser(id) {
      const user = await profiles.findById(id);
      if (!user) throw notFound('User not found');
      return user;
    },

    async setRole(actor, id, role) {
      validateRole(role);
      if (actor.id === id) throw badRequest('Kamu tidak bisa mengubah role akunmu sendiri');
      const updated = await profiles.update(id, { role });
      if (!updated) throw notFound('User not found');
      return updated;
    },

    async deleteUser(actor, id) {
      if (actor.id === id) throw badRequest('Kamu tidak bisa menghapus akunmu sendiri');
      const user = await profiles.findById(id);
      if (!user) throw notFound('User not found');
      if (await borrows.exists({ borrower_id: id })) {
        throw conflict('User punya riwayat peminjaman dan tidak bisa dihapus', 'USER_HAS_HISTORY');
      }
      await profiles.delete(id);
      await authProvider.deleteUser(id).catch(() => {});
    },
  };
}

module.exports = { createAdminService };
