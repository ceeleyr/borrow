const { badRequest } = require('../lib/errors');

module.exports = function createItemController({ items }, storage) {
  return {
    async list(req, res) {
      const { search, category, status } = req.query;
      res.json({ success: true, data: await items.list({ search, category, status }) });
    },
    async get(req, res) {
      res.json({ success: true, data: await items.get(req.params.id) });
    },
    async create(req, res) {
      res.status(201).json({ success: true, data: await items.create(req.user, req.body) });
    },
    async update(req, res) {
      res.json({ success: true, data: await items.update(req.params.id, req.body) });
    },
    async remove(req, res) {
      await items.remove(req.params.id);
      res.json({ success: true, message: 'Item berhasil dihapus' });
    },
    async uploadImage(req, res) {
      if (!req.file) throw badRequest('File gambar wajib diupload');
      await items.get(req.params.id); // 404 lebih dulu sebelum menyimpan file
      const saved = await storage.saveImage({
        itemId: req.params.id,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
      });
      const url = saved.isRelative ? `${req.protocol}://${req.get('host')}${saved.path}` : saved.path;
      res.json({ success: true, data: await items.setImage(req.params.id, url) });
    },
  };
};
