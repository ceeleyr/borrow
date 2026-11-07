module.exports = function createBorrowController({ borrows }) {
  return {
    async create(req, res) {
      res.status(201).json({ success: true, data: await borrows.create(req.user, req.body) });
    },
    async mine(req, res) {
      res.json({ success: true, data: await borrows.listMine(req.user.id, { status: req.query.status }) });
    },
    async get(req, res) {
      res.json({ success: true, data: await borrows.get(req.user, req.params.id) });
    },
    async cancel(req, res) {
      res.json({ success: true, message: 'Request dibatalkan', data: await borrows.cancel(req.user, req.params.id, req.body) });
    },
  };
};
