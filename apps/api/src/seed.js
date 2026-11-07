const { createServices } = require('./services');
const { addDays, toDateString } = require('./lib/dates');

const DEMO_PASSWORD = 'password123';
const DEMO_ACCOUNTS = [
  { email: 'admin@borrow.test', full_name: 'Admin Komunitas', role: 'admin' },
  { email: 'user@borrow.test', full_name: 'Budi Santoso', role: 'user' },
  { email: 'sari@borrow.test', full_name: 'Sari Wulandari', role: 'user' },
];

const DEMO_ITEMS = [
  { name: 'Proyektor Epson', category: 'Elektronik', condition: 'good', quantity: 2, description: 'Proyektor 3600 lumen lengkap dengan kabel HDMI dan remote. Cocok untuk rapat dan kebaktian.' },
  { name: 'Sound System Portable', category: 'Audio', condition: 'good', quantity: 1, description: 'Speaker aktif 15 inch + 2 mic kabel. Daya tahan baterai sekitar 6 jam.' },
  { name: 'Kamera Mirrorless', category: 'Elektronik', condition: 'fair', quantity: 1, description: 'Kamera untuk dokumentasi kegiatan. Sudah termasuk lensa kit dan 2 baterai.' },
  { name: 'Tenda Pleton', category: 'Outdoor', condition: 'good', quantity: 3, description: 'Tenda kapasitas 10 orang untuk kegiatan outdoor.' },
  { name: 'Kursi Lipat', category: 'Perabot', condition: 'good', quantity: 20, description: 'Kursi lipat besi, dipinjam per unit.' },
  { name: 'Laptop Kerja', category: 'Elektronik', condition: 'good', quantity: 2, description: 'Laptop 14 inch untuk keperluan administrasi dan presentasi.' },
  { name: 'Bor Listrik', category: 'Peralatan', condition: 'fair', quantity: 1, description: 'Bor listrik dengan satu set mata bor.' },
  { name: 'Mic Wireless', category: 'Audio', condition: 'poor', quantity: 2, description: 'Sedang diperbaiki, belum bisa dipinjam.', status: 'unavailable' },
];

/**
 * Mengisi data contoh untuk mode demo lewat service layer (bukan menyuntik DB langsung)
 * sehingga stok & status konsisten dengan aturan bisnis.
 * Riwayat "masa lalu" dibuat dengan service ber-clock mundur 7 hari.
 */
async function seedDemo({ repos, authProvider, clock = () => new Date() }) {
  const live = createServices({ repos, authProvider, clock });
  const DAY = 24 * 60 * 60 * 1000;
  const past = createServices({ repos, authProvider, clock: () => new Date(clock().getTime() - 7 * DAY) });

  const users = {};
  for (const acc of DEMO_ACCOUNTS) {
    const created = await live.auth.register({ email: acc.email, password: DEMO_PASSWORD, full_name: acc.full_name });
    users[acc.email] = acc.role === 'admin' ? await repos.profiles.update(created.id, { role: 'admin' }) : created;
  }
  const admin = users['admin@borrow.test'];
  const budi = users['user@borrow.test'];
  const sari = users['sari@borrow.test'];

  const items = {};
  for (const data of DEMO_ITEMS) items[data.name] = await live.items.create(admin, data);

  const today = toDateString(clock());
  const ago = (n) => addDays(today, -n);

  // 1) Sari: kamera sudah diambil 7 hari lalu & lewat jatuh tempo (overdue)
  const overdue = await past.borrows.create(sari, { item_id: items['Kamera Mirrorless'].id, borrow_date: ago(7), due_date: ago(2), note: 'Dokumentasi retret' });
  await past.borrows.approve(admin, overdue.id, {});
  await past.borrows.pickup(admin, overdue.id);

  // 2) Sari: tenda sudah selesai (returned) -> contoh riwayat
  const done = await past.borrows.create(sari, { item_id: items['Tenda Pleton'].id, quantity: 2, borrow_date: ago(7), due_date: ago(4), note: 'Camping pemuda' });
  await past.borrows.approve(admin, done.id, {});
  await past.borrows.pickup(admin, done.id);
  await past.borrows.returnItem(admin, done.id, { admin_note: 'Kembali dalam kondisi baik' });

  // 3) Budi: laptop ditolak
  const rejected = await past.borrows.create(budi, { item_id: items['Laptop Kerja'].id, borrow_date: ago(6), due_date: ago(3) });
  await past.borrows.reject(admin, rejected.id, { admin_note: 'Sedang dipakai untuk administrasi' });

  // 4) Budi: sound system disetujui, menunggu diambil
  const approved = await live.borrows.create(budi, { item_id: items['Sound System Portable'].id, borrow_date: today, due_date: addDays(today, 2), note: 'Acara syukuran' });
  await live.borrows.approve(admin, approved.id, { admin_note: 'Ambil di sekretariat jam 09.00' });

  // 5) Budi: proyektor masih pending
  await live.borrows.create(budi, { item_id: items['Proyektor Epson'].id, quantity: 1, borrow_date: addDays(today, 1), due_date: addDays(today, 3), note: 'Presentasi kegiatan' });

  return { users, items };
}

module.exports = { seedDemo, DEMO_ACCOUNTS, DEMO_PASSWORD };
