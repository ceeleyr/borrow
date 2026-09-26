const { supabaseAdmin: supabase } = require('../config/supabase');

async function getAllUsers(req, res) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  res.json({ success: true, data });
}

async function getUserById(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, created_at')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.json({ success: true, data });
}

module.exports = { getAllUsers, getUserById };