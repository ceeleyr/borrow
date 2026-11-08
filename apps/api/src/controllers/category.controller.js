module.exports = function createCategoryController({ categories }) {
  return {
    async list(req, res) {
      res.json({ success: true, data: await categories.list() });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await categories.create(req.body) });
    },
  };
};
