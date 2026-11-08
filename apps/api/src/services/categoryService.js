const { badRequest } = require('../lib/errors');

function createCategoryService({ categories }) {
  return {
    async list() {
      return categories.list();
    },
    async create(body) {
      const name = body?.name ? String(body.name).trim() : '';
      if (!name) throw badRequest('Nama kategori wajib diisi');
      if (name.length > 50) throw badRequest('Nama kategori maksimal 50 karakter');
      return categories.create({ name });
    },
  };
}

module.exports = { createCategoryService };
