# Aplikasi Pengontrol Peminjaman Barang Komunitas

## 1. Deskripsi Masalah

Dalam suatu komunitas, seperti komunitas kampus, sekolah, gereja, maupun organisasi, biasanya terdapat berbagai barang yang dapat digunakan secara bersama. Namun, proses peminjaman barang sering kali masih dilakukan secara manual, misalnya melalui chat atau pencatatan sederhana.

Cara tersebut dapat menyebabkan beberapa masalah, seperti pengguna tidak mengetahui barang yang tersedia, permintaan peminjaman sulit dipantau, serta admin kesulitan mengetahui barang yang sedang dipinjam dan siapa yang meminjamnya. Riwayat peminjaman juga dapat sulit dilacak apabila pencatatan tidak dilakukan secara terstruktur.

Oleh karena itu, dibutuhkan sebuah aplikasi yang dapat membantu komunitas mengelola barang dan proses peminjaman secara terpusat. Aplikasi ini memungkinkan pengguna melihat barang yang tersedia dan mengajukan permintaan peminjaman, sementara admin dapat mengelola barang serta menyetujui atau menolak permintaan peminjaman.

---

## 2. Profil Target Pengguna

Target pengguna aplikasi adalah komunitas yang memiliki barang atau fasilitas yang digunakan secara bersama, seperti komunitas kampus, sekolah, gereja, maupun organisasi.

Aplikasi memiliki dua jenis pengguna utama:

### Anggota Komunitas (User)

Anggota komunitas merupakan pengguna yang membutuhkan barang untuk digunakan dalam kegiatan tertentu. User dapat melihat barang yang tersedia, mengajukan permintaan peminjaman, serta memantau status permintaan dan peminjaman mereka.

### Pengelola Barang (Admin)

Admin merupakan pengurus atau anggota komunitas yang bertanggung jawab dalam mengelola inventaris barang. Admin dapat mengelola data barang, memeriksa permintaan peminjaman, memberikan persetujuan atau penolakan, serta memantau proses pengembalian barang.

---

## 3. Manfaat Aplikasi

Aplikasi ini diharapkan dapat memberikan manfaat sebagai berikut:

* Memudahkan anggota komunitas mengetahui barang yang tersedia untuk dipinjam.
* Mempermudah proses pengajuan dan persetujuan peminjaman.
* Membantu admin mengelola inventaris barang secara lebih terstruktur.
* Memudahkan admin dalam mengetahui barang yang sedang dipinjam dan siapa yang meminjamnya.
* Mengurangi ketergantungan pada pencatatan peminjaman secara manual.
* Menyimpan riwayat peminjaman sehingga penggunaan barang dapat dilacak dengan lebih mudah.
* Mengurangi risiko terjadinya peminjaman yang tidak tercatat atau barang yang sulit dilacak.

---

## 4. Daftar Fitur Inti

### 4.1 Autentikasi dan Hak Akses

* User dan admin dapat melakukan login.
* Sistem membedakan hak akses berdasarkan role.
* User hanya dapat mengakses fitur yang berkaitan dengan peminjaman.
* Admin dapat mengakses fitur pengelolaan barang dan peminjaman.

### 4.2 Manajemen Barang

Admin dapat:

* Menambahkan barang.
* Mengubah informasi barang.
* Menghapus barang.
* Melihat daftar barang.
* Melihat detail barang.
* Mengatur status ketersediaan barang.

Informasi barang minimal terdiri dari:

* Nama barang
* Deskripsi
* Jumlah
* Kondisi
* Status ketersediaan

### 4.3 Pengajuan Peminjaman

User dapat:

* Melihat daftar barang yang tersedia.
* Melihat detail barang.
* Memilih barang yang ingin dipinjam.
* Mengajukan permintaan peminjaman.
* Menentukan tanggal peminjaman dan rencana tanggal pengembalian.
* Melihat status permintaan peminjaman.

### 4.4 Persetujuan Peminjaman

Admin dapat:

* Melihat permintaan peminjaman yang masuk.
* Melihat detail permintaan.
* Menyetujui permintaan peminjaman.
* Menolak permintaan peminjaman.

Alur utama peminjaman:

```text
User memilih barang
        ↓
User mengajukan request
        ↓
Admin memeriksa request
        ↓
   ┌────┴────┐
   ↓         ↓
Disetujui  Ditolak
   ↓
User mengambil barang
dari Admin
   ↓
Barang sedang dipinjam
```

### 4.5 Pengembalian Barang

* Admin dapat mencatat barang yang telah dikembalikan.
* Status peminjaman berubah menjadi selesai setelah barang dikembalikan.
* Status barang kembali menjadi tersedia setelah proses pengembalian selesai.

### 4.6 Riwayat Peminjaman

* User dapat melihat riwayat peminjaman mereka.
* Admin dapat melihat riwayat peminjaman barang.
* Riwayat mencatat informasi seperti barang, peminjam, tanggal peminjaman, tanggal pengembalian, dan status peminjaman.

### 4.7 Status Peminjaman

Sistem menggunakan status untuk menunjukkan tahapan peminjaman:

```text
Available
    ↓
Pending
    ↓
Approved
    ↓
Borrowed
    ↓
Returned
```

Apabila permintaan ditolak:

```text
Pending → Rejected
```

---

## 5. Fitur yang Tidak Dikerjakan

Untuk menjaga agar proyek tetap realistis dan dapat diselesaikan dalam 12 pertemuan, fitur berikut tidak termasuk dalam scope utama:

* Sistem pembayaran atau denda otomatis.
* Integrasi payment gateway.
* Notifikasi melalui SMS.
* Integrasi langsung dengan WhatsApp atau aplikasi chat lainnya.
* Integrasi dengan Google Calendar atau kalender eksternal.
* QR Code atau RFID untuk proses peminjaman dan pengembalian.
* Tracking lokasi barang secara real-time.
* Sistem rekomendasi barang.
* Sistem approval bertingkat.
* Integrasi dengan banyak komunitas dalam satu sistem.
* Analisis penggunaan barang menggunakan machine learning.
* Aplikasi mobile native Android/iOS apabila versi utama dikembangkan sebagai aplikasi web.

Fitur-fitur tersebut dapat menjadi pengembangan lanjutan setelah fitur inti aplikasi berhasil dibuat.

---

## 6. Kriteria Aplikasi Dinyatakan Berhasil

Aplikasi dinyatakan berhasil apabila proses utama peminjaman barang dapat dilakukan melalui sistem secara terstruktur, mulai dari pengajuan hingga pengembalian barang.

Kriteria keberhasilan aplikasi:

1. User dapat melakukan login ke dalam aplikasi.
2. User dapat melihat daftar dan detail barang yang tersedia.
3. User dapat mengajukan permintaan peminjaman.
4. User dapat melihat status permintaan peminjaman.
5. Admin dapat melihat permintaan peminjaman yang masuk.
6. Admin dapat menyetujui atau menolak permintaan peminjaman.
7. Sistem dapat memperbarui status peminjaman sesuai dengan proses yang dilakukan.
8. Admin dapat mencatat pengambilan dan/atau pengembalian barang sesuai alur aplikasi.
9. Status barang dapat berubah menjadi tersedia kembali setelah barang dikembalikan.
10. Data peminjaman tersimpan dan dapat dilihat sebagai riwayat.
11. User tidak dapat mengakses fitur khusus admin.
12. Admin dapat mengelola data barang yang tersedia untuk dipinjam.
