const { supabaseAdmin, supabaseAuth } = require('../config/supabase');

async function register(req, res) {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'email, password, dan full_name wajib diisi' });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return res.status(400).json({ success: false, message: authError.message });
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: authData.user.id, email, full_name });

  if (profileError) {
    return res.status(500).json({ success: false, message: profileError.message });
  }

  res.status(201).json({ success: true, data: { id: authData.user.id, email, full_name } });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email dan password wajib diisi' });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ success: false, message: error.message });
  }

  res.json({
    success: true,
    data: {
      user: data.user,
      access_token: data.session.access_token,
    },
  });
}

module.exports = { register, login };