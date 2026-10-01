const { supabaseAdmin: supabase } = require('../config/supabase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ success: false, message: 'Token tidak valid' });
  }

  req.user = data.user;
  next();
}

async function requireAdmin(req, res, next) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (error || !profile || profile.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Akses khusus admin' });
  }

  next();
}

module.exports = { requireAuth, requireAdmin };