const { badRequest } = require('./errors');
const { ITEM_CONDITIONS, ROLES, MAX_LOAN_DAYS } = require('../models/constants');
const { isValidDateString, isValidDateTimeString, diffDays, addDays, toDateString } = require('./dates');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalStr(value, field, max) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`${field} harus berupa teks`);
  const v = value.trim();
  if (v.length > max) throw badRequest(`${field} maksimal ${max} karakter`);
  return v === '' ? null : v;
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseIntStrict(value, field, { min, max }) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(n)) throw badRequest(`${field} harus berupa bilangan bulat`);
  if (n < min) throw badRequest(`${field} minimal ${min}`);
  if (max !== undefined && n > max) throw badRequest(`${field} maksimal ${max}`);
  return n;
}

function validateRegister(body = {}) {
  const email = str(body.email).toLowerCase();
  const full_name = str(body.full_name);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || !full_name) {
    throw badRequest('email, password, dan full_name wajib diisi');
  }
  if (!EMAIL_RE.test(email)) throw badRequest('Format email tidak valid');
  if (password.length < 6) throw badRequest('Password minimal 6 karakter');
  if (full_name.length > 100) throw badRequest('Nama maksimal 100 karakter');
  return { email, password, full_name };
}

function validateLogin(body = {}) {
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) throw badRequest('email dan password wajib diisi');
  return { email, password };
}

function validateProfileUpdate(body = {}) {
  const out = {};
  if (body.full_name !== undefined) {
    const name = str(body.full_name);
    if (!name) throw badRequest('Nama tidak boleh kosong');
    if (name.length > 100) throw badRequest('Nama maksimal 100 karakter');
    out.full_name = name;
  }
  if (body.avatar_url !== undefined) {
    const url = optionalStr(body.avatar_url, 'avatar_url', 500);
    if (url && !isHttpUrl(url)) throw badRequest('avatar_url harus berupa URL http(s)');
    out.avatar_url = url;
  }
  if (Object.keys(out).length === 0) throw badRequest('Tidak ada data yang diubah');
  return out;
}

/**
 * @param {object} body
 * @param {{partial?: boolean, allowStatus?: boolean}} opts
 */
function validateItem(body = {}, { partial = false } = {}) {
  const out = {};

  if (!partial || body.name !== undefined) {
    const name = str(body.name);
    if (!name) throw badRequest('name wajib diisi');
    if (name.length > 100) throw badRequest('name maksimal 100 karakter');
    out.name = name;
  }

  const description = optionalStr(body.description, 'description', 1000);
  if (description !== undefined) out.description = description;

  const category = optionalStr(body.category, 'category', 50);
  if (category !== undefined) out.category = category;

  if (body.condition !== undefined) {
    if (!ITEM_CONDITIONS.includes(body.condition)) {
      throw badRequest(`condition harus salah satu dari: ${ITEM_CONDITIONS.join(', ')}`);
    }
    out.condition = body.condition;
  }

  if (body.quantity !== undefined) {
    out.quantity = parseIntStrict(body.quantity, 'quantity', { min: 1, max: 10000 });
  }

  if (body.status !== undefined) {
    if (!['available', 'unavailable'].includes(body.status)) {
      throw badRequest('status hanya boleh diubah menjadi available atau unavailable');
    }
    out.status = body.status;
  }

  if (body.image_url !== undefined) {
    const url = optionalStr(body.image_url, 'image_url', 500);
    if (url && !isHttpUrl(url) && !url.startsWith('/uploads/')) {
      throw badRequest('image_url harus berupa URL http(s)');
    }
    out.image_url = url;
  }

  if (partial && Object.keys(out).length === 0) throw badRequest('Tidak ada data yang diubah');
  return out;
}

/**
 * Toleransi 1 hari pada batas "tanggal pinjam tidak boleh di masa lalu"
 * agar pengguna di zona waktu berbeda dari server tidak ditolak keliru.
 */
function validateBorrowRequest(body = {}, now = new Date()) {
  const item_id = str(body.item_id);
  if (!item_id) throw badRequest('item_id wajib diisi');

  const quantity =
    body.quantity === undefined ? 1 : parseIntStrict(body.quantity, 'quantity', { min: 1, max: 1000 });

  const today = toDateString(now);
  const borrowDateInput = body.borrow_date === undefined ? today : body.borrow_date;
  const due_date = body.due_date;
  const borrowDay = typeof borrowDateInput === 'string' ? borrowDateInput.slice(0, 10) : '';

  if (!isValidDateString(borrowDateInput) && !isValidDateTimeString(borrowDateInput)) {
    throw badRequest('borrow_date harus tanggal atau datetime lokal yang valid');
  }
  if (!isValidDateString(due_date)) throw badRequest('due_date (rencana pengembalian) wajib format YYYY-MM-DD');
  if (borrowDay < addDays(today, -1)) throw badRequest('Tanggal pinjam tidak boleh di masa lalu');
  if (due_date < borrowDay) throw badRequest('Tanggal kembali tidak boleh sebelum tanggal pinjam');
  if (diffDays(borrowDay, due_date) > MAX_LOAN_DAYS) {
    throw badRequest(`Durasi pinjam maksimal ${MAX_LOAN_DAYS} hari`);
  }

  const note = optionalStr(body.note, 'note', 300);
  const borrow_date = isValidDateString(borrowDateInput) ? `${borrowDateInput}T00:00:00` : borrowDateInput;
  return { item_id, quantity, borrow_date, due_date, note: note ?? null };
}

function validateRole(role) {
  if (!Object.values(ROLES).includes(role)) {
    throw badRequest(`role harus salah satu dari: ${Object.values(ROLES).join(', ')}`);
  }
  return role;
}

function validateAdminNote(body = {}) {
  return optionalStr(body.admin_note ?? body.reason, 'admin_note', 300) ?? null;
}

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateItem,
  validateBorrowRequest,
  validateRole,
  validateAdminNote,
  isHttpUrl,
};
