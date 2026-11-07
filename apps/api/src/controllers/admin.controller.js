module.exports = function createAdminController({ admin, borrows }) {
  return {
    async stats(req, res) {
      res.json({ success: true, data: await admin.stats() });
    },
    async listUsers(req, res) {
      res.json({ success: true, data: await admin.listUsers() });
    },
    async getUser(req, res) {
      res.json({ success: true, data: await admin.getUser(req.params.id) });
    },
    async setRole(req, res) {
      res.json({ success: true, data: await admin.setRole(req.user, req.params.id, req.body?.role) });
    },
    async deleteUser(req, res) {
      await admin.deleteUser(req.user, req.params.id);
      res.json({ success: true, message: 'User dihapus oleh admin' });
    },
    async listRequests(req, res) {
      const { status, search } = req.query;
      res.json({ success: true, data: await borrows.listAll({ status, search }) });
    },
    async approve(req, res) {
      res.json({ success: true, message: 'Request disetujui', data: await borrows.approve(req.user, req.params.id, req.body) });
    },
    async reject(req, res) {
      res.json({ success: true, message: 'Request ditolak', data: await borrows.reject(req.user, req.params.id, req.body) });
    },
    async pickup(req, res) {
      res.json({ success: true, message: 'Barang dicatat sudah diambil', data: await borrows.pickup(req.user, req.params.id) });
    },
    async returnItem(req, res) {
      res.json({ success: true, message: 'Item berhasil dikembalikan', data: await borrows.returnItem(req.user, req.params.id, req.body) });
    },
    async cancel(req, res) {
      res.json({ success: true, message: 'Request dibatalkan', data: await borrows.cancel(req.user, req.params.id, req.body) });
    },
  };
};
