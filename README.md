# ZEVA Logistik Material - Operator Tracking

Aplikasi operasional berbasis web untuk memantau aktivitas operator dalam pengambilan material dari rak, pengiriman ke line/area produksi, hingga pencatatan waktu perjalanan dan status pengiriman. Sistem ini dirancang untuk mendukung alur kerja Gemba dan Lean Manufacturing dengan fokus pada kecepatan onboarding, verifikasi lokasi tujuan, serta audit trail event log.

## 1. Status Proyek

Dokumen ini memadukan dua sudut pandang:

1. **Spesifikasi operasional formal** yang menjelaskan visi, proses bisnis, dan kebutuhan fungsional sistem.
2. **Status implementasi saat ini** yang mencerminkan fitur yang sudah tersedia pada branch `main`.

Dengan demikian, README ini berfungsi sekaligus sebagai:
- dokumentasi sistem untuk stakeholder dan tim teknis,
- deskripsi fitur yang sudah ada di aplikasi,
- daftar roadmap pengembangan ke depan.

> Status implementasi: aplikasi saat ini berjalan sebagai aplikasi frontend berbasis browser dengan penyimpanan lokal (`localStorage`). Belum ada backend/API atau database relasional yang aktif.

## 2. Ringkasan Sistem

Sistem ZEVA Logistik Material bertujuan menangani proses pengiriman material dari gudang ke line produksi dengan mekanisme yang cepat, terdokumentasi, dan terverifikasi. Fokus utama sistem adalah:

- pengurangan waktu onboarding operator,
- validasi lokasi tujuan melalui QR code line/proses,
- pencatatan waktu pengiriman secara kronologis,
- pemantauan status task dan item material,
- akses role-based untuk Admin, SPV, Manager, dan Operator.

### Versi operasional yang dirancang

Versi formal yang diharapkan mencakup fitur-fitur berikut:

- Fast-track login operator menggunakan ID karyawan atau QR/barcode.
- Auto-create user dan task baru bila operator belum terdaftar.
- Validasi pengiriman wajib melalui scan QR code lokasi proses tujuan.
- Auto-fallback saat operator lupa menekan tombol berangkat.
- Pencatatan spatiotemporal log T1, T2, T3.
- Monitor real-time untuk supervisor dan KPI untuk manager.
- Struktur data yang terdefinisi dan eksport backup serta laporan.

### Kondisi implementasi saat ini

Pada implementasi saat ini, fitur yang sudah tersedia meliputi:

- login operator dengan ID karyawan / scan QR
- auto-create akun + task baru untuk operator baru
- panel task operator untuk menambahkan item, qty, rak, material, dan line tujuan
- validasi pemindai lokasi tujuan dengan scan QR line
- fallback otomatis saat `T1` belum ada
- log event dan riwayat task
- modul Admin, SPV, Manager, serta manajemen user/master data
- import/export master dan backup database JSON
- ekspor laporan Excel untuk SPV/Manager

## 3. Tujuan Sistem

1. Memungkinkan operator login cepat dan tanpa hambatan administrasi.
2. Mempercepat pembuatan task baru bagi operator baru.
3. Mencatat waktu pengiriman dan pengembalian material secara konsisten.
4. Mengurangi risiko human error seperti lupa menekan tombol keberangkatan.
5. Memisahkan hak akses dan tampilan sesuai peran pengguna.
6. Menyediakan audit trail dan KPI untuk evaluasi operasional.

## 4. Role dan Otorisasi Akses

### 4.1 Admin

Fungsi utama:
- kelola master data rak, material, dan line/proses
- generate dan print QR code
- kelola pengguna
- import/export backup database
- akses log & audit trail

### 4.2 SPV (Supervisor)

Fungsi utama:
- monitoring task aktif
- filter operator, line, material, dan shift
- melihat status pengiriman dan lead time
- analisis operasional dan alert

### 4.3 Manager

Fungsi utama:
- KPI dan analitik performa
- monitoring volume, lead time, dan efisiensi
- drill-down per operator dan line
- ekspor laporan Excel

### 4.4 Operator

Fungsi utama:
- melakukan task material dari rak ke line
- menambah item task dan scan tujuan
- melihat riwayat task dan melanjutkan task aktif

> Catatan aktual: pada implementasi saat ini, role diproses di sisi frontend/browser dan bukan pengganti otorisasi backend yang aman untuk sistem produksi.

## 5. Alur Kerja Operator (Aktual)

### 5.1 Login & routing

1. Operator memasukkan atau memindai ID karyawan.
2. Jika ID belum terdaftar, aplikasi membuat akun baru dan task baru.
3. Jika ID terdaftar dan memiliki task `new` atau `active`, aplikasi akan membuka task tersebut secara langsung.
4. Jika tidak ada task aktif, operator diarahkan ke riwayat task.

### 5.2 Input task

Operator melakukan langkah berikut:
- memilih/memindai rak asal,
- memilih/memindai material,
- memasukkan qty,
- memilih line tujuan,
- menambahkan item ke troli task.

Saat item ditambahkan, timestamp `last_material_scanned_at` disimpan.

### 5.3 Keberangkatan / T1

- Tombol **Konfirmasi Berangkat** akan mengubah item dari status `PICKED` menjadi `IN_TRANSIT`.
- `T1` (`picked_at`) disimpan saat tombol ditekan.
- Mode keberangkatan ditandai sebagai `MANUAL_PRESS`.

### 5.4 Verifikasi tujuan / T2

- Operator melakukan scan QR code lokasi proses/line.
- Sistem membandingkan QR yang dipindai dengan target line item.
- Jika cocok, item berubah menjadi `DELIVERED` dan menyimpan `T2` (`delivered_at`).
- Durasi pengiriman dihitung sebagai `T2 - T1`.

### 5.5 Fallback otomatis

Jika item belum memiliki `T1` ketika scan QR tujuan dilakukan, maka:
- `T1` diisi dari `last_material_scanned_at`,
- mode keberangkatan berubah menjadi `AUTO_FALLBACK`,
- item tetap diproses sebagai delivered.

### 5.6 Kembali ke rak / T3

Setelah pengiriman, operator menekan tombol **Kembali ke Rak (Catat T3)** untuk menyimpan `return_at` dan durasi kembali.

> Catatan aktual: timer auto-confirm 5 detik belum ada pada implementasi saat ini. T3 saat ini belum dipicu dari scan rak; namun dicatat melalui tombol return.

## 6. Prinsip Tracking & Waktu

Model tracking formal yang dirancang:

- T1 = Picked / Departure Time
- T2 = Delivered Time
- T3 = Return / Next Cycle Start

Perhitungan yang direncanakan:

- Delivery Lead Time = T2 - T1
- Return Lead Time = T3 - T2
- Round-Trip = T3 - T1
- Inter-Line Transit = T2b - T2a

Model yang diimplementasikan saat ini:

- `picked_at` menyimpan T1 saat konfirmasi berangkat atau fallback otomatis
- `delivered_at` menyimpan T2 setelah scan QR tujuan valid
- `return_at` menyimpan T3 saat tombol kembali ke rak ditekan
- `delivery_duration_sec` dihitung dari T2 - T1
- `return_duration_sec` dihitung dari T3 - T2

## 7. Status Item dan Event Log

### Status item

- `PICKED`
- `IN_TRANSIT`
- `DELIVERED`
- `CANCELLED`

### Status task

- `new`
- `active`
- `completed`
- `cancelled`

### Mode keberangkatan

- `MANUAL_PRESS`
- `AUTO_FALLBACK`

### Event log

Aplikasi saat ini merekam event seperti:
- login
- task dibuat
- material dipilih
- item berangkat
- item delivered
- scan lokasi salah
- item kembali ke rak
- import/export database

Semua log tersedia di modul Admin dan beberapa log digunakan di monitoring SPV/Manager.

## 8. Dashboard dan UI

### 8.1 Admin

Available saat ini:
- master rak/material/line
- user management
- QR generator & bulk print
- import Excel/CSV master
- ekspor/import JSON backup
- log timeline dan raw table

### 8.2 SPV

Available saat ini:
- live monitoring grid
- filter shift, operator, line, dan material
- ringkasan KPI operational
- grafik dan analitik
- ekspor laporan Excel

### 8.3 Manager

Available saat ini:
- ringkasan KPI
- visualisasi lead time dan volume
- drill-down performa operator
- ekspor Excel

> Eksport PDF untuk laporan eksekutif belum tersedia pada implementasi saat ini.

## 9. Data dan Struktur Sistem

Pada catatan perencanaan, sistem sering digambarkan dengan skema relasional SQL. Namun implementasi saat ini tidak menggunakan database server atau SQL backend. Data disimpan di browser dengan `localStorage`.

Struktur data yang dipakai saat ini bersifat object-based, meliputi:

- `users`
- `raks`
- `materials`
- `lines`
- `tasks`
- `taskItems`
- `logs`

Data ini dipersiapkan melalui seed data awal dan dikelola langsung dari aplikasi frontend.

## 10. Persiapan dan Menjalankan Aplikasi

### Persyaratan

- Node.js
- npm

### Langkah start

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
```

## 11. Batasan Implementasi Saat Ini

Aplikasi saat ini memiliki beberapa batasan yang perlu dicatat:

- Data disimpan di browser (`localStorage`), bukan database backend.
- Tidak ada multidevice sync, API server, atau autentikasi server-side.
- Role checking hanya berjalan di frontend dan tidak menggantikan keamanan backend.
- Password staf disimpan sebagai nilai data biasa di browser untuk demo.
- Tidak ada ekspor PDF untuk Manager.
- Timer auto-confirm 5 detik tidak ada.
- T3 tidak dipicu dari scan rak, melainkan tombol return.
- Timeline event real-time per detik lebih sesuai sebagai roadmap, bukan fitur yang sudah tersedia penuh.
- Tidak ada database relasional aktif seperti skema SQL yang sering digambarkan dalam perancangan awal.

## 12. Future Roadmap

Roadmap yang disarankan untuk pengembangan ke depan:

### Prioritas 1 — Stabilitas & Backend
- migrasi data dari localStorage ke backend API/database,
- autentikasi sesi yang aman,
- otorisasi server-side untuk Admin/SPV/Manager/Operator,
- audit trail yang sepenuhnya terintegrasi dan tidak tergantung browser.

### Prioritas 2 — Pengalaman operator
- auto-confirm countdown 5 detik,
- peningkatan scanner dan auto-focus input,
- alur progres task yang lebih presisi dan hands-free,
- validasi multi-task dan multi-drop yang lebih eksplisit.

### Prioritas 3 — Monitoring & KPI
- timeline event real-time per operator dan per task,
- dashboard SPV yang lebih kaya dengan alert laten dan bottleneck,
- laporan PDF untuk eksekutif,
- export Excel yang lebih terstruktur dan formatting KPI.

### Prioritas 4 — Operasional produksi
- sinkronisasi multi-user real-time,
- sistem backup/restore server-side,
- pencatatan lokasi GPS/route jika dipakai pada lingkungan lapangan,
- API integrasi dengan MES/ERP atau sistem manufaktur lain.

## 13. Catatan Akhir

Dokumen ini dibuat untuk menjaga keseimbangan antara kebutuhan formal proyek dan keadaan implementasi yang ada saat ini. Dengan kata lain:

- bagian perencanaan menjelaskan “apa yang ingin dicapai” dan “apa yang menjadi target operasional sistem”,
- bagian status implementasi menjelaskan “apa yang sudah dapat digunakan di aplikasi yang ada sekarang”,
- bagian roadmap menjelaskan “apa yang masih perlu dikembangkan untuk mencapai versi produksi yang lebih matang”.

Dengan pendekatan ini, README tetap relevan untuk stakeholder, tim pengembang, dan pengguna akhir, tanpa menyesatkan tentang fitur yang belum tersedia secara aktual.

---

Versi dokumen: 1.6 (formalized + implementation-aware)
Status: Aktif untuk branch `main` dengan catatan roadmap pengembangan
