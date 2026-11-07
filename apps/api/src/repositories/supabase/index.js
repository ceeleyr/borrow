const BORROW_SELECT =
  '*, item:items(id, name, image_url, category), ' +
  'borrower:profiles!borrow_requests_borrower_id_fkey(id, full_name, email)';

function check(error) {
  if (error) {
    const e = new Error(error.message);
    e.cause = error;
    throw e;
  }
}

// Karakter yang punya arti khusus di filter PostgREST `or(...)`
const sanitizeSearch = (s) => String(s).replace(/[,()%*\\]/g, ' ').trim();

/**
 * Repository berbasis Supabase (PostgreSQL). Kontraknya sama persis dengan repository memory.
 * Skema: lihat apps/api/db/schema.sql
 */
function createSupabaseRepositories(client) {
  const profiles = {
    async create(data) {
      const { data: row, error } = await client
        .from('profiles')
        .insert({
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role || 'user',
          avatar_url: data.avatar_url ?? null,
        })
        .select()
        .single();
      check(error);
      return row;
    },
    async findById(id) {
      const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle();
      check(error);
      return data;
    },
    async findByEmail(email) {
      const { data, error } = await client.from('profiles').select('*').ilike('email', email).maybeSingle();
      check(error);
      return data;
    },
    async list() {
      const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
      check(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client.from('profiles').update(patch).eq('id', id).select().maybeSingle();
      check(error);
      return data;
    },
    async delete(id) {
      const { error } = await client.from('profiles').delete().eq('id', id);
      check(error);
      return true;
    },
    async count() {
      const { count, error } = await client.from('profiles').select('*', { count: 'exact', head: true });
      check(error);
      return count || 0;
    },
  };

  const items = {
    async create(data) {
      const quantity = data.quantity ?? 1;
      const { data: row, error } = await client
        .from('items')
        .insert({
          name: data.name,
          description: data.description ?? null,
          category: data.category ?? null,
          condition: data.condition || 'good',
          quantity,
          available_quantity: quantity,
          status: 'available',
          image_url: data.image_url ?? null,
          created_by: data.created_by ?? null,
        })
        .select()
        .single();
      check(error);
      return row;
    },
    async findById(id) {
      const { data, error } = await client.from('items').select('*').eq('id', id).maybeSingle();
      check(error);
      return data;
    },
    async list({ search, category, status } = {}) {
      let q = client.from('items').select('*').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      if (category) q = q.ilike('category', sanitizeSearch(category));
      const term = search ? sanitizeSearch(search) : '';
      if (term) q = q.or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
      const { data, error } = await q;
      check(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from('items')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle();
      check(error);
      return data;
    },
    async delete(id) {
      const { error } = await client.from('items').delete().eq('id', id);
      check(error);
      return true;
    },
    async count({ status } = {}) {
      let q = client.from('items').select('*', { count: 'exact', head: true });
      if (status) q = q.eq('status', status);
      const { count, error } = await q;
      check(error);
      return count || 0;
    },
    /** Atomik via fungsi SQL adjust_item_stock (lihat db/schema.sql). Null bila stok tidak cukup. */
    async adjustStock(id, delta) {
      const { data, error } = await client.rpc('adjust_item_stock', { p_item_id: id, p_delta: delta });
      check(error);
      const row = Array.isArray(data) ? data[0] : data;
      return row && row.id ? row : null;
    },
  };

  const borrows = {
    async create(data) {
      const { data: row, error } = await client
        .from('borrow_requests')
        .insert({
          item_id: data.item_id,
          borrower_id: data.borrower_id,
          quantity: data.quantity ?? 1,
          borrow_date: data.borrow_date,
          due_date: data.due_date,
          note: data.note ?? null,
          status: 'pending',
        })
        .select(BORROW_SELECT)
        .single();
      check(error);
      return row;
    },
    async findById(id) {
      const { data, error } = await client.from('borrow_requests').select(BORROW_SELECT).eq('id', id).maybeSingle();
      check(error);
      return data;
    },
    async list({ borrower_id, item_id, status } = {}) {
      let q = client.from('borrow_requests').select(BORROW_SELECT).order('requested_at', { ascending: false });
      if (borrower_id) q = q.eq('borrower_id', borrower_id);
      if (item_id) q = q.eq('item_id', item_id);
      if (status) q = q.in('status', [].concat(status));
      const { data, error } = await q;
      check(error);
      return data;
    },
    async transition(id, fromStatuses, patch) {
      const { data, error } = await client
        .from('borrow_requests')
        .update(patch)
        .eq('id', id)
        .in('status', fromStatuses)
        .select(BORROW_SELECT)
        .maybeSingle();
      check(error);
      return data;
    },
    async count({ status } = {}) {
      let q = client.from('borrow_requests').select('*', { count: 'exact', head: true });
      if (status) q = q.in('status', [].concat(status));
      const { count, error } = await q;
      check(error);
      return count || 0;
    },
    async exists({ item_id, borrower_id, status } = {}) {
      let q = client.from('borrow_requests').select('id', { count: 'exact', head: true });
      if (item_id) q = q.eq('item_id', item_id);
      if (borrower_id) q = q.eq('borrower_id', borrower_id);
      if (status) q = q.in('status', [].concat(status));
      const { count, error } = await q;
      check(error);
      return (count || 0) > 0;
    },
  };

  return { profiles, items, borrows };
}

module.exports = { createSupabaseRepositories };
