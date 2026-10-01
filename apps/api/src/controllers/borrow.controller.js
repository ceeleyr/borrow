const { supabaseAdmin: supabase } = require('../config/supabase');

async function createBorrowRequest(req, res) {
  const { item_id } = req.body;

  if (!item_id) {
    return res.status(400).json({ success: false, message: 'item_id wajib diisi' });
  }

  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('id, owner_id, status')
    .eq('id', item_id)
    .single();

  if (itemError || !item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  if (item.owner_id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Kamu tidak bisa meminjam barang milikmu sendiri' });
  }

  if (item.status !== 'available') {
    return res.status(400).json({ success: false, message: 'Item sedang tidak tersedia' });
  }

  const { data, error } = await supabase
    .from('borrow_requests')
    .insert({ item_id, borrower_id: req.user.id })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.status(201).json({ success: true, data });
}

async function getMyRequests(req, res) {
  const { data, error } = await supabase
    .from('borrow_requests')
    .select('*, item:items(id, name, image_url)')
    .eq('borrower_id', req.user.id)
    .order('requested_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}

async function getReceivedRequests(req, res) {
  const { data, error } = await supabase
    .from('borrow_requests')
    .select('*, item:items!inner(id, name, owner_id), borrower:profiles!borrow_requests_borrower_id_fkey(id, full_name)')
    .eq('item.owner_id', req.user.id)
    .order('requested_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}

async function approveRequest(req, res) {
  const { id } = req.params;

  const { data: request, error: findError } = await supabase
    .from('borrow_requests')
    .select('*, item:items(owner_id, status)')
    .eq('id', id)
    .single();

  if (findError || !request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  if (request.item.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Kamu tidak punya akses untuk approve request ini' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Request ini sudah diproses sebelumnya' });
  }

  const { error: updateError } = await supabase
    .from('borrow_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: req.user.id })
    .eq('id', id);

  if (updateError) {
    return res.status(500).json({ success: false, message: updateError.message });
  }

  await supabase.from('items').update({ status: 'borrowed' }).eq('id', request.item_id);

  res.json({ success: true, message: 'Request disetujui' });
}

async function rejectRequest(req, res) {
  const { id } = req.params;

  const { data: request, error: findError } = await supabase
    .from('borrow_requests')
    .select('*, item:items(owner_id)')
    .eq('id', id)
    .single();

  if (findError || !request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  if (request.item.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Kamu tidak punya akses untuk reject request ini' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Request ini sudah diproses sebelumnya' });
  }

  const { error } = await supabase.from('borrow_requests').update({ status: 'rejected' }).eq('id', id);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, message: 'Request ditolak' });
}

async function returnItem(req, res) {
  const { id } = req.params;

  const { data: request, error: findError } = await supabase
    .from('borrow_requests')
    .select('*, item:items(owner_id)')
    .eq('id', id)
    .single();

  if (findError || !request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  const isOwner = request.item.owner_id === req.user.id;
  const isBorrower = request.borrower_id === req.user.id;

  if (!isOwner && !isBorrower) {
    return res.status(403).json({ success: false, message: 'Kamu tidak punya akses untuk aksi ini' });
  }

  if (request.status !== 'approved') {
    return res.status(400).json({ success: false, message: 'Item ini belum dalam status dipinjam' });
  }

  const { error: updateError } = await supabase
    .from('borrow_requests')
    .update({ status: 'returned', returned_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return res.status(500).json({ success: false, message: updateError.message });
  }

  await supabase.from('items').update({ status: 'available' }).eq('id', request.item_id);

  res.json({ success: true, message: 'Item berhasil dikembalikan' });
}

module.exports = {
  createBorrowRequest,
  getMyRequests,
  getReceivedRequests,
  approveRequest,
  rejectRequest,
  returnItem,
};