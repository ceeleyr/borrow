# Panduan Rilis (Release Candidate)

Dokumen ini untuk membuat APK/AAB dari aplikasi mobile dan memastikan API siap dipakai di luar mode demo.

## 1. Sebelum build

1. **Ganti placeholder** di `eas.json`: `EXPO_PUBLIC_API_URL` harus menunjuk ke API yang bisa diakses dari HP (misalnya `https://api-anda.example.com/api`). Localhost tidak bisa diakses dari HP saat rilis.
2. **Ganti package id** di `app.json` (`android.package`, default `com.example.borrow`) menjadi id unik milik Anda. Id ini tidak boleh berubah setelah aplikasi pernah dipublikasikan.
3. Pastikan API berjalan dengan `DATA_STORE=supabase` dan `LOG_LEVEL=info` (atau `warn` untuk produksi).
4. Jalankan tes dan typecheck:
   ```bash
   cd apps/api && npm test
   cd apps/mobile && npm test && npm run typecheck
   ```

## 2. Build APK untuk uji coba

Perlu akun Expo dan login sekali: `npx eas-cli login`.

```bash
cd apps/mobile
npm run build:apk
```

Hasilnya berupa link unduhan APK. Pasang di Android (aktifkan "Install from unknown sources" bila diminta).

## 3. Build untuk Play Store

```bash
cd apps/mobile
npm run build:release
```

Menghasilkan `.aab`. `autoIncrement` menaikkan `versionCode` otomatis setiap build.

## 4. Checklist uji sebelum rilis

- [ ] Login, register, dan logout berjalan
- [ ] Katalog tampil; cari barang; pull-to-refresh
- [ ] Matikan Wi-Fi: katalog dan pinjaman menampilkan data tersimpan + pesan "Menampilkan data tersimpan terakhir"
- [ ] Tombol "Coba lagi" muncul saat gagal dan berfungsi
- [ ] Tambah barang dengan foto dari kamera/galeri
- [ ] Ajukan pinjaman, lalu proses sampai dikembalikan
- [ ] Izin notifikasi diminta; pengingat H-1 pengembalian terjadwal
- [ ] Logout menghapus data tersimpan (login dengan akun lain tidak melihat data sebelumnya)
- [ ] Layar kecil dan tablet: layout tidak terpotong, form tidak tertutup keyboard

## 5. Memantau API saat berjalan

API menulis log JSON satu baris per event ke stdout:

```json
{"time":"2026-11-19T06:51:00.000Z","level":"info","msg":"request","method":"GET","path":"/api/items","status":200,"durationMs":42}
```

- Level diatur lewat `LOG_LEVEL` (`debug`, `info`, `warn`, `error`).
- Error tak terduga tercatat sebagai level `error` lengkap dengan stack trace.
- Header, token, dan body request sengaja tidak pernah dicatat.
