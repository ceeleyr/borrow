# API Reference

Base URL: `http://localhost:3000/api` · Auth: header `Authorization: Bearer <access_token>`
Format sukses `{ "success": true, "data": ... }` · gagal `{ "success": false, "message": "...", "code": "..." }`

Status HTTP: `400` validasi · `401` token hilang/tidak valid · `403` tidak punya akses · `404` tidak ditemukan · `409` konflik aturan bisnis (stok, transisi status, duplikat).

## Auth
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | publik | `{email, password(min 6), full_name}` → profil (role `user`) |
| POST | `/auth/login` | publik | → `{user, access_token}` |
| GET | `/auth/me` | login | profil + role (dipakai app untuk memulihkan sesi) |
| PUT | `/users/me` | login | ubah `full_name` / `avatar_url` |

## Kategori
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/categories` | publik | daftar kategori untuk dropdown (disimpan di tabel SQL `categories`) |
| POST | `/categories` | login | `{name}` → tambah kategori baru (tersedia via tombol "Add Category" pada dropdown) |

## Barang
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/items?search=&category=&status=` | publik | katalog |
| GET | `/items/:id` | publik | detail |
| POST | `/items` | admin | `{name, description?, category?, condition(good/fair/poor), quantity, image_url?, status?}` |
| PUT | `/items/:id` | admin | ubah sebagian field; `quantity` menyesuaikan stok tersedia; `status` = `available`/`unavailable` |
| DELETE | `/items/:id` | admin | 409 bila sudah punya riwayat peminjaman |
| POST | `/items/:id/image` | admin | multipart field `image` (jpg/png/webp/gif, maks 5MB) — admin mengunggah foto barang langsung dari perangkat (bukan URL teks) |

Status barang: `available`, `borrowed` (stok habis, otomatis), `unavailable` (dinonaktifkan admin).

## Peminjaman (anggota)
| Method | Path | Akses | Keterangan |
|---|---|---|---|
| POST | `/borrow-requests` | user | `{item_id, quantity?=1, borrow_date?(default hari ini), due_date, note?}` format `YYYY-MM-DD`, maks 30 hari |
| GET | `/borrow-requests/mine?status=` | login | riwayat milik sendiri |
| GET | `/borrow-requests/:id` | pemilik / admin | detail |
| PATCH | `/borrow-requests/:id/cancel` | pemilik (pending) / admin | batal |

Setiap request memuat `is_overdue` (status `borrowed` dan lewat `due_date`).

## Admin (`/admin/*`, role admin)
| Method | Path | Keterangan |
|---|---|---|
| GET | `/admin/stats` | ringkasan dashboard |
| GET | `/admin/borrow-requests?status=&search=` | semua permintaan / riwayat |
| PATCH | `/admin/borrow-requests/:id/approve` | `pending → approved`, menahan stok |
| PATCH | `/admin/borrow-requests/:id/reject` | `pending → rejected` |
| PATCH | `/admin/borrow-requests/:id/pickup` | `approved → borrowed` (barang diambil) |
| PATCH | `/admin/borrow-requests/:id/return` | `borrowed → returned`, stok kembali |
| PATCH | `/admin/borrow-requests/:id/cancel` | batalkan `pending`/`approved` (stok dikembalikan) |
| GET | `/admin/users` · `/users` · `/users/:id` | daftar / detail pengguna |
| PATCH | `/admin/users/:id/role` | `{role: "user"|"admin"}` (tidak bisa untuk diri sendiri) |
| DELETE | `/admin/users/:id` | 409 bila punya riwayat; tidak bisa hapus diri sendiri |

Body opsional untuk approve/reject/return/cancel: `{ "admin_note": "..." }`.

## Perubahan dari versi awal
Barang kini **dikelola admin** (sesuai spesifikasi), bukan milik user: moderasi `pending/rejected` pada barang, endpoint `/borrow-requests/received` dan approve/reject oleh pemilik dihapus; digantikan alur admin di atas. `GET /users` kini khusus admin.
