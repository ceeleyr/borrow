const crypto = require('crypto');
const { deriveItemStatus } = require('../../domain/borrowFlow');

const clone = (v) => (v === null || v === undefined ? v : structuredClone(v));
const nowIso = () => new Date().toISOString();
const includesCI = (haystack, needle) => String(haystack ?? '').toLowerCase().includes(needle);
const newestFirst = (map) => [...map.values()].reverse();

/**
 * Repository in-memory. Dipakai untuk mode demo (tanpa Supabase) dan unit/integration test.
 * Semua method async agar kontraknya identik dengan repository Supabase.
 */
function createMemoryRepositories() {
  const defaultCategories = ['Elektronik', 'Alat & Perkakas', 'Outdoor & Camping', 'Audio & Visual', 'Olahraga', 'Perlengkapan Acara'];
  const db = {
    profiles: new Map(),
    categories: new Map(
      defaultCategories.map((name) => {
        const id = crypto.randomUUID();
        return [id, { id, name, created_at: nowIso() }];
      })
    ),
    items: new Map(),
    borrows: new Map(),
  };

  const categories = {
    async list() {
      return [...db.categories.values()]
        .map(clone)
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
    },
    async findById(id) {
      return clone(db.categories.get(id) || null);
    },
    async findByName(name) {
      const lower = String(name || '').trim().toLowerCase();
      return clone([...db.categories.values()].find((c) => c.name.toLowerCase() === lower) || null);
    },
    async create(data) {
      const name = String(data.name || '').trim();
      const existing = await categories.findByName(name);
      if (existing) return existing;
      const cat = {
        id: data.id || crypto.randomUUID(),
        name,
        created_at: nowIso(),
      };
      db.categories.set(cat.id, cat);
      return clone(cat);
    },
    async delete(id) {
      return db.categories.delete(id);
    },
  };

  const profiles = {
    async create(data) {
      const profile = {
        id: data.id || crypto.randomUUID(),
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'user',
        avatar_url: data.avatar_url ?? null,
        created_at: nowIso(),
      };
      db.profiles.set(profile.id, profile);
      return clone(profile);
    },
    async findById(id) {
      return clone(db.profiles.get(id) || null);
    },
    async findByEmail(email) {
      const e = String(email).toLowerCase();
      return clone([...db.profiles.values()].find((p) => p.email.toLowerCase() === e) || null);
    },
    async list() {
      return newestFirst(db.profiles).map(clone);
    },
    async update(id, patch) {
      const p = db.profiles.get(id);
      if (!p) return null;
      Object.assign(p, patch);
      return clone(p);
    },
    async delete(id) {
      return db.profiles.delete(id);
    },
    async count() {
      return db.profiles.size;
    },
  };

  const items = {
    async create(data) {
      const ts = nowIso();
      const quantity = data.quantity ?? 1;
      const item = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        condition: data.condition || 'good',
        quantity,
        available_quantity: quantity,
        status: 'available',
        image_url: data.image_url ?? null,
        created_by: data.created_by ?? null,
        created_at: ts,
        updated_at: ts,
      };
      db.items.set(item.id, item);
      return clone(item);
    },
    async findById(id) {
      return clone(db.items.get(id) || null);
    },
    async list({ search, category, status } = {}) {
      const q = search ? String(search).trim().toLowerCase() : '';
      return newestFirst(db.items)
        .filter((i) => !status || i.status === status)
        .filter((i) => !category || String(i.category ?? '').toLowerCase() === String(category).toLowerCase())
        .filter((i) => !q || includesCI(i.name, q) || includesCI(i.description, q) || includesCI(i.category, q))
        .map(clone);
    },
    async update(id, patch) {
      const item = db.items.get(id);
      if (!item) return null;
      Object.assign(item, patch, { updated_at: nowIso() });
      return clone(item);
    },
    async delete(id) {
      return db.items.delete(id);
    },
    async count({ status } = {}) {
      return [...db.items.values()].filter((i) => !status || i.status === status).length;
    },
    /** Ubah stok tersedia secara atomik. Return null bila hasil di luar 0..quantity. */
    async adjustStock(id, delta) {
      const item = db.items.get(id);
      if (!item) return null;
      const next = item.available_quantity + delta;
      if (next < 0 || next > item.quantity) return null;
      item.available_quantity = next;
      item.status = deriveItemStatus(item);
      item.updated_at = nowIso();
      return clone(item);
    },
  };

  function hydrate(b) {
    const item = db.items.get(b.item_id);
    const borrower = db.profiles.get(b.borrower_id);
    return {
      ...clone(b),
      item: item
        ? { id: item.id, name: item.name, image_url: item.image_url, category: item.category }
        : null,
      borrower: borrower ? { id: borrower.id, full_name: borrower.full_name, email: borrower.email } : null,
    };
  }

  const borrows = {
    async create(data) {
      const b = {
        id: crypto.randomUUID(),
        item_id: data.item_id,
        borrower_id: data.borrower_id,
        quantity: data.quantity ?? 1,
        borrow_date: data.borrow_date,
        due_date: data.due_date,
        note: data.note ?? null,
        admin_note: null,
        status: 'pending',
        requested_at: data.requested_at || nowIso(),
        approved_at: null,
        approved_by: null,
        picked_up_at: null,
        returned_at: null,
        rejected_at: null,
        cancelled_at: null,
      };
      db.borrows.set(b.id, b);
      return hydrate(b);
    },
    async findById(id) {
      const b = db.borrows.get(id);
      return b ? hydrate(b) : null;
    },
    async list({ borrower_id, item_id, status } = {}) {
      const statuses = status ? [].concat(status) : null;
      return newestFirst(db.borrows)
        .filter((b) => !borrower_id || b.borrower_id === borrower_id)
        .filter((b) => !item_id || b.item_id === item_id)
        .filter((b) => !statuses || statuses.includes(b.status))
        .map(hydrate);
    },
    /** Compare-and-set: hanya update jika status saat ini ada di `fromStatuses`. */
    async transition(id, fromStatuses, patch) {
      const b = db.borrows.get(id);
      if (!b || !fromStatuses.includes(b.status)) return null;
      Object.assign(b, patch);
      return hydrate(b);
    },
    async count({ status } = {}) {
      const statuses = status ? [].concat(status) : null;
      return [...db.borrows.values()].filter((b) => !statuses || statuses.includes(b.status)).length;
    },
    async exists({ item_id, borrower_id, status } = {}) {
      const statuses = status ? [].concat(status) : null;
      return [...db.borrows.values()].some(
        (b) =>
          (!item_id || b.item_id === item_id) &&
          (!borrower_id || b.borrower_id === borrower_id) &&
          (!statuses || statuses.includes(b.status))
      );
    },
  };

  return { profiles, categories, items, borrows, _db: db };
}

module.exports = { createMemoryRepositories };
