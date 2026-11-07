# System Architecture

## Tech Stack

| Component          | Technology            | Purpose                          |
| ------------------ | --------------------- | -------------------------------- |
| Frontend           | React Native + Expo   | Mobile application               |
| Backend            | Express.js            | Custom REST API & business logic |
| Database           | Supabase (PostgreSQL) | Data storage                     |
| Backend Deployment | Vercel                | Deploy Express.js API            |
| Mobile Build       | Expo / EAS            | Build Android `.apk`             |

---

## Architecture Overview

```text
┌─────────────────────────────┐
│     React Native + Expo     │
│                             │
│       Mobile Client         │
└──────────────┬──────────────┘
               │
               │ HTTPS / REST API
               ▼
┌─────────────────────────────┐
│         Express.js          │
│                             │
│      Custom REST API        │
│   Authentication & Logic    │
└──────────────┬──────────────┘
               │
               │ Supabase Client
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│       PostgreSQL DB         │
└─────────────────────────────┘
```

## Components

### Frontend — React Native + Expo

Responsible for:

* User and admin interfaces
* Navigation
* User input
* Sending requests to the backend
* Displaying API responses

During development, the application can be tested using **Expo Go**.

### Backend — Express.js

Acts as the application's API layer.

Responsible for:

* Authentication and authorization
* Request validation
* Business logic
* Item management
* Borrowing management
* Communication with Supabase

The frontend does not access the database directly.

### Database — Supabase

Supabase provides the PostgreSQL database used to store:

* Users
* Items
* Borrowing transactions
* Borrowing status
* Borrowing history

Basic relationship:

```text
Users
  │
  │ 1:N
  ▼
Borrowings
  │
  │ N:1
  ▼
Items
```

---

## Borrowing Flow

```text
User
 │
 │ Submit borrowing request
 ▼
Express.js API
 │
 │ Validate & create request
 ▼
Supabase
 │
 ▼
Pending
 │
 ├──────────────► Rejected
 │
 ▼
Approved
 │
 ▼
Borrowed
 │
 ▼
Returned
 │
 ▼
Item Available
```

---

## Deployment

### Backend

```text
Git Repository
      │
      ▼
    Vercel
      │
      ▼
Express.js API
```

The Express.js backend is deployed through Vercel from the Git repository.

### Mobile Application

```text
React Native
      │
      ▼
     Expo
      │
      ├──► Expo Go (Development)
      │
      └──► EAS Build → Android APK
```

Environment variables are used for API and database configuration. Sensitive credentials are not stored directly in the source code.

# Arsitektur

```
apps/
  api/      Express 5 (CommonJS)
    src/
      app.js            factory aplikasi (semua dependensi di-inject)
      bootstrap.js      memilih backend: supabase | memory
      routes/ controllers/   lapisan HTTP tipis
      services/         aturan bisnis (auth, item, borrow, admin)  <- inti yang diuji
      domain/borrowFlow.js   state machine peminjaman (fungsi murni)
      repositories/     memory/ (demo+test) dan supabase/ (produksi), kontrak sama
      auth/             memoryAuthProvider (JWT lokal) / supabaseAuthProvider
      storage/          local disk / Supabase Storage
      lib/              validators, dates, errors
      seed.js           data demo (dibuat lewat service, bukan injeksi DB)
    db/schema.sql       skema + fungsi adjust_item_stock (atomik) untuk Supabase
    tests/              unit/ + integration/ (node:test)
  mobile/   Expo (expo-router) + React Native Web
    src/lib/            logika murni (status, tanggal, validasi, url API, error) — diuji
    src/services/       http (axios) + api (semua endpoint) + client (RN-specific)
    src/contexts/       AuthProvider (pulihkan sesi via /auth/me)
    src/features/ src/app/   layar; hak akses via Stack.Protected + cek role
    tests/              unit (node:test)
```

## Alur status peminjaman
```
pending ──approve──▶ approved ──pickup──▶ borrowed ──return──▶ returned
   │                    │
   ├──reject──▶ rejected└──cancel (admin)──▶ cancelled
   └──cancel (peminjam/admin)──▶ cancelled
```
Stok: ditahan saat **approve**, dikembalikan saat **return** atau **cancel** pada status approved.
Perubahan status memakai compare-and-set (`transition(id, fromStatuses, patch)`) dan stok memakai `adjustStock` atomik,
sehingga dua admin menekan tombol yang sama tidak menggandakan pengurangan stok.

## Keputusan desain
- **Dua mode data**: `memory` membuat app langsung jalan & mudah diuji; `supabase` untuk produksi. Pilihan otomatis dari `.env`.
- **Role selalu dibaca dari DB** pada setiap request (bukan dari token), jadi perubahan role langsung berlaku.
- Barang/user yang punya riwayat tidak dihapus (integritas riwayat); barang cukup dinonaktifkan.
