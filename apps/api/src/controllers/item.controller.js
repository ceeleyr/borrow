const { supabaseAdmin: supabase } = require('../config/supabase');

async function getAllItems(req, res) {
  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles(id, full_name, avatar_url)')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}

async function getItemById(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles(id, full_name, avatar_url)')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  res.json({ success: true, data });
}

async function createItem(req, res) {
  const { name, description, category, condition } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'name wajib diisi' });
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: req.user.id,
      name,
      description,
      category,
      condition: condition || 'good',
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.status(201).json({ success: true, data });
}

async function updateItem(req, res) {
  const { id } = req.params;
  const { name, description, category, condition, status } = req.body;

  const { data: existingItem, error: findError } = await supabase
    .from('items')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (findError || !existingItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  if (existingItem.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Kamu tidak punya akses untuk mengubah item ini' });
  }

  const { data, error } = await supabase
    .from('items')
    .update({ name, description, category, condition, status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}

async function deleteItem(req, res) {
  const { id } = req.params;

  const { data: existingItem, error: findError } = await supabase
    .from('items')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (findError || !existingItem) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  if (existingItem.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Kamu tidak punya akses untuk menghapus item ini' });
  }

  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, message: 'Item berhasil dihapus' });
}

async function uploadItemImage(req, res) {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'File gambar wajib diupload' });
  }

  const { data: item, error: findError } = await supabase
    .from('items')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (findError || !item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  if (item.owner_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Kamu tidak punya akses untuk item ini' });
  }

  const fileExt = req.file.originalname.split('.').pop();
  const fileName = `${id}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('item-images')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    return res.status(500).json({ success: false, message: uploadError.message });
  }

  const { data: publicUrlData } = supabase.storage.from('item-images').getPublicUrl(fileName);

  const { data, error } = await supabase
    .from('items')
    .update({ image_url: publicUrlData.publicUrl })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}

module.exports = { getAllItems, getItemById, createItem, updateItem, deleteItem, uploadItemImage };