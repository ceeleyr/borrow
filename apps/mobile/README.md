# Mobile — Aplikasi Peminjaman Barang

Aplikasi Expo (expo-router) untuk Android dan web. Struktur rute ada di `src/app/`, logika di `src/lib/`, dan akses API di `src/services/`.

## Menjalankan

```bash
npm install
npm run web          # browser
npm start            # lalu scan QR dengan Expo Go (API harus bisa diakses dari HP)
```

Pastikan API sudah berjalan (lihat README utama). Untuk HP, set alamat API yang bisa dijangkau:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api npm start
```

## Tes dan typecheck

```bash
npm test
npm run typecheck
```

## Fitur utama

- **Login dan register**, sesi tersimpan di SecureStore (native) atau localStorage (web).
- **Katalog barang dan pinjaman**, dengan cache lokal (AsyncStorage). Saat offline, data terakhir ditampilkan dengan peringatan. Pinjaman tidak bisa diajukan dari data cache.
- **Retry otomatis** untuk request baca yang gagal, plus tombol "Coba lagi".
- **Kamera dan galeri** untuk foto barang (admin).
- **Pengingat pengembalian** lewat notifikasi lokal, H-1 pukul 09.00.
- **Layout adaptif**: katalog 2 kolom di layar lebar.

## Build APK

Lihat [RELEASE.md](RELEASE.md) untuk langkah build dan checklist uji sebelum rilis. Sebelum build, ganti placeholder URL API di `eas.json` dan package id di `app.json`.
