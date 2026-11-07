const { notFound, conflict, badRequest } = require('../lib/errors');
const { validateItem } = require('../lib/validators');
const { deriveItemStatus } = require('../domain/borrowFlow');
const { ITEM_STATUS } = require('../models/constants');

function createItemService({ items, borrows }) {
  async function mustFind(id) {
    const item = await items.findById(id);
    if (!item) throw notFound('Item not found');
    return item;
  }

  return {
    list(filters = {}) {
      const status = Object.values(ITEM_STATUS).includes(filters.status) ? filters.status : undefined;
      return items.list({ search: filters.search, category: filters.category, status });
    },

    get: mustFind,

    async create(admin, body) {
      const data = validateItem(body);
      const created = await items.create({ ...data, created_by: admin.id });
      if (data.status === ITEM_STATUS.UNAVAILABLE) {
        return items.update(created.id, { status: ITEM_STATUS.UNAVAILABLE });
      }
      return created;
    },

    async update(id, body) {
      const item = await mustFind(id);
      const data = validateItem(body, { partial: true });
      const patch = { ...data };

      // Ubah total stok -> sesuaikan stok tersedia; tidak boleh di bawah unit yang sedang keluar.
      if (data.quantity !== undefined) {
        const out = item.quantity - item.available_quantity;
        if (data.quantity < out) {
          throw conflict(`Jumlah tidak boleh di bawah ${out} (unit yang sedang dipinjam/dipesan)`);
        }
        patch.available_quantity = data.quantity - out;
      }

      const merged = { ...item, ...patch };
      patch.status = deriveItemStatus({
        status: patch.status ?? (item.status === ITEM_STATUS.UNAVAILABLE ? ITEM_STATUS.UNAVAILABLE : ITEM_STATUS.AVAILABLE),
        available_quantity: merged.available_quantity,
      });

      return items.update(id, patch);
    },

    async remove(id) {
      await mustFind(id);
      if (await borrows.exists({ item_id: id })) {
        throw conflict(
          'Barang sudah punya riwayat peminjaman dan tidak bisa dihapus. Ubah statusnya menjadi unavailable.',
          'ITEM_HAS_HISTORY'
        );
      }
      await items.delete(id);
    },

    async setImage(id, imageUrl) {
      await mustFind(id);
      if (!imageUrl) throw badRequest('URL gambar tidak valid');
      return items.update(id, { image_url: imageUrl });
    },
  };
}

module.exports = { createItemService };
