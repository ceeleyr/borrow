# Borrow API Documentation

Base URL (local dev): `http://localhost:3000`

Semua request/response pakai format JSON. Response sukses selalu punya `success: true`, response gagal `success: false` dengan field `message`.

Endpoint yang butuh login harus kirim header:
```
Authorization: Bearer <access_token>
```
Token didapat dari response `POST /api/auth/login`.

---

## Auth

### Register
```
POST /api/auth/register
```
Body:
```json
{
  "email": "user@gmail.com",
  "password": "password123",
  "full_name": "Nama User"
}
```
Response `201`:
```json
{ "success": true, "data": { "id": "uuid", "email": "...", "full_name": "..." } }
```

### Login
```
POST /api/auth/login
```
Body:
```json
{ "email": "user@gmail.com", "password": "password123" }
```
Response `200`:
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "...": "..." },
    "access_token": "eyJ..."
  }
}
```

---

## Items

### Get all items (public, hanya status `available`)
```
GET /api/items
```
Tidak perlu auth.

### Get item by ID
```
GET /api/items/:id
```
Tidak perlu auth.

### Create item (auth required)
```
POST /api/items
```
Header: `Authorization: Bearer <token>`
Body:
```json
{
  "name": "Bor Listrik",
  "description": "Bor listrik Bosch",
  "category": "tools",
  "condition": "good"
}
```
Item baru otomatis berstatus `pending`, menunggu approve admin sebelum muncul di `GET /api/items` publik.

### Update item (auth required, hanya owner)
```
PUT /api/items/:id
```
Header: `Authorization: Bearer <token>`
Body (partial update, kirim field yang mau diubah saja):
```json
{ "status": "unavailable" }
```
Response `403` kalau bukan owner item tersebut.

### Delete item (auth required, hanya owner)
```
DELETE /api/items/:id
```
Header: `Authorization: Bearer <token>`

### Upload gambar item (auth required, hanya owner)
```
POST /api/items/:id/image
```
Header: `Authorization: Bearer <token>`
Body: `form-data`, key `image` (type **File**)
Response: item dengan `image_url` terisi link Supabase Storage.

---

## Borrow Requests

### Ajukan pinjam item (auth required)
```
POST /api/borrow-requests
```
Header: `Authorization: Bearer <token>`
Body:
```json
{ "item_id": "uuid-item" }
```
Validasi: tidak bisa pinjam barang sendiri, item harus berstatus `available`.

### Lihat request yang saya ajukan (auth required)
```
GET /api/borrow-requests/mine
```
Header: `Authorization: Bearer <token>`

### Lihat request masuk untuk item saya (auth required, sebagai owner)
```
GET /api/borrow-requests/received
```
Header: `Authorization: Bearer <token>`

### Approve request (auth required, hanya owner item)
```
PATCH /api/borrow-requests/:id/approve
```
Header: `Authorization: Bearer <token>`
Efek: status request jadi `approved`, status item jadi `borrowed`.

### Reject request (auth required, hanya owner item)
```
PATCH /api/borrow-requests/:id/reject
```
Header: `Authorization: Bearer <token>`

### Return item (auth required, owner atau borrower)
```
PATCH /api/borrow-requests/:id/return
```
Header: `Authorization: Bearer <token>`
Efek: status request jadi `returned`, status item balik jadi `available`.

---

## Users

### Get all users
```
GET /api/users
```
Tidak perlu auth (pertimbangkan di-protect nanti kalau mau private).

### Get user by ID
```
GET /api/users/:id
```
Tidak perlu auth.

---

## Admin

Semua endpoint di bawah ini butuh `Authorization: Bearer <token>` **dan** user tersebut harus punya `role: 'admin'` di tabel `profiles` (di-set manual lewat SQL Editor Supabase untuk sekarang).

### Lihat semua item (termasuk pending/rejected)
```
GET /api/admin/items
```

### Approve item (moderasi, item jadi `available`)
```
PATCH /api/admin/items/:id/approve
```

### Reject item (item jadi `rejected`)
```
PATCH /api/admin/items/:id/reject
```

### Hapus item (admin, siapa pun pemiliknya)
```
DELETE /api/admin/items/:id
```

### Lihat semua user
```
GET /api/admin/users
```

### Hapus user
```
DELETE /api/admin/users/:id
```

### Lihat semua borrow request (dari semua user)
```
GET /api/admin/borrow-requests
```

### Approve borrow request (bypass ownership check)
```
PATCH /api/admin/borrow-requests/:id/approve
```

### Reject borrow request (bypass ownership check)
```
PATCH /api/admin/borrow-requests/:id/reject
```

### Statistik sistem
```
GET /api/admin/stats
```
Response:
```json
{
  "success": true,
  "data": {
    "totalUsers": 0,
    "totalItems": 0,
    "totalRequests": 0,
    "activeBorrows": 0
  }
}
```

---

## Status Values Reference

**Item status:** `pending` → `available` / `rejected` → `borrowed` → `available` (lagi, setelah return)

**Borrow request status:** `pending` → `approved` / `rejected` → `returned` (setelah approved)

**User role:** `user` (default) atau `admin`

---

## Known Gaps / Belum Diimplementasi

- Edit profil user (update nama, avatar sendiri)
- Cancel request oleh borrower (status `pending` → batal)
- Search/filter items (by kategori, nama)
- Pagination untuk list endpoint
- Forgot password
- Endpoint untuk assign role admin ke user lain (masih manual via SQL)