const { supabaseAdmin: supabase } = require('../config/supabase');

async function getAllItemsAdmin(req, res) {
  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles(id, full_name, email)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
}

async function getAllUsersAdmin(req, res) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
}

async function approveItem(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('items').update({ status: 'available' }).eq('id', id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Item disetujui dan tampil ke publik' });
}

async function rejectItem(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('items').update({ status: 'rejected' }).eq('id', id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Item ditolak' });
}

async function deleteItemAdmin(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Item dihapus oleh admin' });
}

async function deleteUserAdmin(req, res) {
  const { id } = req.params;

  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) return res.status(500).json({ success: false, message: authError.message });

  res.json({ success: true, message: 'User dihapus oleh admin' });
  // Catatan: hapus dari auth.users otomatis cascade hapus row di profiles
  // KALAU kamu udah set foreign key profiles.id -> auth.users.id dengan ON DELETE CASCADE.
  // Kalau belum, tambahin: await supabase.from('profiles').delete().eq('id', id);
}

async function getAllBorrowRequestsAdmin(req, res) {
  const { data, error } = await supabase
    .from('borrow_requests')
    .select('*, item:items(id, name), borrower:profiles!borrow_requests_borrower_id_fkey(id, full_name)')
    .order('requested_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
}

async function approveRequestAdmin(req, res) {
  const { id } = req.params;

  const { data: request, error: findError } = await supabase
    .from('borrow_requests')
    .select('item_id')
    .eq('id', id)
    .single();

  if (findError || !request) return res.status(404).json({ success: false, message: 'Request not found' });

  await supabase
    .from('borrow_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: req.user.id })
    .eq('id', id);

  await supabase.from('items').update({ status: 'borrowed' }).eq('id', request.item_id);

  res.json({ success: true, message: 'Request disetujui oleh admin' });
}

async function rejectRequestAdmin(req, res) {
  const { id } = req.params;
  const { error } = await supabase.from('borrow_requests').update({ status: 'rejected' }).eq('id', id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: 'Request ditolak oleh admin' });
}

async function getStats(req, res) {
  const [{ count: totalUsers }, { count: totalItems }, { count: totalRequests }, { count: activeBorrows }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('borrow_requests').select('*', { count: 'exact', head: true }),
      supabase.from('borrow_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    ]);

  res.json({
    success: true,
    data: { totalUsers, totalItems, totalRequests, activeBorrows },
  });
}

module.exports = {
  getAllItemsAdmin,
  getAllUsersAdmin,
  approveItem,
  rejectItem,
  deleteItemAdmin,
  deleteUserAdmin,
  getAllBorrowRequestsAdmin,
  approveRequestAdmin,
  rejectRequestAdmin,
  getStats,
};