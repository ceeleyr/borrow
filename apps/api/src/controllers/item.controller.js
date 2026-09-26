const { supabaseAdmin: supabase } = require('../config/supabase');

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


async function getAllItems(req, res) {
  const { data, error } = await supabase
    .from('items')
    .select('*, owner:profiles(id, full_name, avatar_url)')
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

module.exports = { getAllItems, getItemById, createItem };
