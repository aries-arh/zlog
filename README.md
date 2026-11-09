# ZEVA Logistik Material — Operator Tracking v1.6

Aplikasi web berbasis React dan TypeScript untuk demo/pencatatan alur pengambilan material dari rak, pengiriman ke line produksi, verifikasi QR lokasi tujuan, serta monitoring KPI. README ini menjelaskan **perilaku yang tersedia pada implementasi saat ini**, bukan rancangan fitur yang belum dibuat.

> **Status penyimpanan:** aplikasi saat ini menyimpan data di `localStorage` browser. Belum ada API/backend atau database server. Data tidak otomatis tersinkron antarperangkat/browser.

## Fitur saat ini

- Login operator menggunakan ID karyawan atau QR/barcode; tersedia input manual dan pemindai kamera.
- Akun operator baru dibuat otomatis bersama task awal, lalu langsung diarahkan ke panel input.
- Operator terdaftar yang memiliki task berstatus `new` atau `active` langsung masuk ke task tersebut. Jika tidak ada task aktif, operator masuk ke riwayat task.
- Login staf Admin, SPV, dan Manager melalui username dan password.
- Pengelolaan master rak, material, line/proses, dan pengguna; pembuatan QR code serta pratinjau/cetak label massal.
- Import master dari Excel/CSV dan ekspor/impor backup database JSON.
- Input beberapa item material dalam satu task, pencatatan keberangkatan, verifikasi scan QR tujuan, dan pencatatan kembali ke rak.
- Monitoring SPV, dashboard KPI Manager, visualisasi grafik, dan ekspor laporan Excel.
- Audit log untuk login, task, pengambilan material, keberangkatan, pengiriman, penolakan scan, kembali ke rak, serta pemulihan database.
- Sesi diakhiri setelah 5 menit tanpa aktivitas.

## Teknologi

- React, TypeScript, Vite
- Persistensi browser dengan Web Storage API (`localStorage`)
- QR code, pemindaian kamera, dan ekspor/impor spreadsheet/JSON

## Menjalankan aplikasi secara lokal

Pastikan Node.js dan npm tersedia. Dari direktori repository:

```bash
npm install
npm run dev
```

Vite akan menampilkan URL lokal di terminal. Untuk membuat build produksi:

```bash
npm run build
```

## Alur kerja operator

1. Operator memasukkan atau memindai ID karyawan. ID dengan panjang kurang dari 3 karakter ditolak.
2. Jika ID belum ditemukan, aplikasi membuat akun operator aktif dan task baru, kemudian membuka panel input.
3. Jika ID sudah terdaftar dan aktif:
   - task berstatus `new` atau `active` yang ditemukan akan dibuka langsung;
   - jika tidak ada task seperti itu, aplikasi menampilkan riwayat task dengan pilihan melanjutkan atau membuat task baru.
4. Di panel task, operator memilih/memindai rak, memilih/memindai material, mengisi qty dan line tujuan, lalu menambahkan item ke troli. Timestamp `last_material_scanned_at` dicatat saat item ditambahkan.
5. Tombol **Konfirmasi Berangkat** mengubah item berstatus `PICKED` menjadi `IN_TRANSIT`, menyimpan `T1` (`picked_at`) dan mode `MANUAL_PRESS`.
6. Di tujuan, operator membuka verifikasi dan memindai QR proses/line. Kode dibandingkan tanpa membedakan huruf besar-kecil. Item aktif yang target line-nya cocok berubah menjadi `DELIVERED` dan memperoleh `T2` serta durasi pengiriman.
7. Bila item yang cocok belum memiliki `T1`, scan tujuan menjalankan fallback: `T1` diambil dari `last_material_scanned_at` (atau waktu saat ini jika timestamp tersebut tidak tersedia), dan mode menjadi `AUTO_FALLBACK`.
8. Setelah pengiriman, operator menekan **Kembali ke Rak (Catat T3)**. Aplikasi mencatat `return_at` dan durasi kembali untuk item delivered yang belum memiliki timestamp kembali.
9. Task dapat diselesaikan setelah tidak ada item `PICKED` atau `IN_TRANSIT` dan terdapat item delivered.

### Catatan penting terkait alur aktual

- **Tidak ada timer auto-confirm 5 detik.** Keberangkatan manual terjadi saat tombol ditekan. Fallback otomatis baru diterapkan saat scan QR tujuan jika `T1` belum ada.
- **T3 tidak dipicu oleh scan rak.** Saat ini T3 dicatat melalui tombol kembali ke rak.
- Satu scan tujuan dapat menyelesaikan seluruh item aktif dalam task yang memiliki line tujuan dengan QR yang cocok. Dengan demikian, beberapa item untuk line yang sama menerima timestamp T2 yang sama; scan tujuan lain dapat menyelesaikan item untuk line lain (multi-drop).
- Scan yang tidak cocok ditolak, menghasilkan pesan/audio error, dan dicatat di log.
- Pemindaian input rak/material tersedia melalui input dan modal scanner; dukungan aktual kamera bergantung pada izin browser dan perangkat. Panel input juga menyediakan pilihan cepat dari master data.
- Setelah verifikasi sukses, operator dapat mencatat kembali ke rak melalui tombol pada hasil verifikasi atau kartu status pengiriman.

## Role dan akses

| Role | Akses aplikasi saat ini |
| --- | --- |
| **Admin** | Akses semua tampilan, master data, QR generator/print, user management, log/timeline audit, import/export database, dan tampilan operator. Penghapusan user bersifat permanen, bukan soft delete. |
| **SPV** | Live monitoring grid, grafik/analitik, filter shift/line/operator dan pencarian material/rak/operator, serta ekspor laporan Excel. |
| **Manager** | Grafik/analitik, ringkasan KPI, filter shift, drill-down kinerja operator dan distribusi volume per line, serta ekspor laporan Excel. PDF belum tersedia. |
| **Operator** | Riwayat task dan panel input task. Tidak memiliki akses ke dashboard staf. |

Pemeriksaan role dilakukan di sisi aplikasi/browser. Ini **bukan** pengganti otorisasi backend dan tidak boleh dianggap sebagai batas keamanan untuk sistem produksi yang menyimpan data sensitif.

## Data, waktu, dan log

Data utama yang disimpan di browser meliputi:

- Pengguna (`users`), master rak (`raks`), material (`materials`), dan line (`lines`).
- Task (`tasks`) dan item task (`taskItems`).
- Event log kronologis (`logs`), dibatasi hingga 500 entri terakhir.
- Informasi sesi, task aktif, tampilan terakhir, dan waktu aktivitas terakhir.

Item task menggunakan ID string dan mencakup antara lain `task_id`, `user_id`, `rak_id`, `material_id`, `line_id`, `qty`, `status`, `departure_mode`, `last_material_scanned_at`, serta timestamp/durasi berikut:

- `picked_at` (`T1`): waktu konfirmasi keberangkatan manual atau timestamp fallback dari scan material terakhir.
- `delivered_at` (`T2`): waktu scan QR line tujuan yang valid.
- `return_at` (`T3`): waktu tombol kembali ke rak ditekan.
- `delivery_duration_sec`: selisih `T2 - T1`.
- `return_duration_sec`: selisih `T3 - T2`.

Dashboard Manager menampilkan rata-rata delivery lead time dan round-trip. Untuk item yang belum mempunyai durasi kembali, perhitungan round-trip saat ini menggunakan delivery duration saja; angka tersebut bukan round-trip penuh.

### Penyimpanan dan backup

- Data tersimpan per origin/browser di `localStorage`; membersihkan data situs/browser dapat menghapus data aplikasi.
- Data awal contoh dimuat ketika penyimpanan terkait masih kosong.
- Admin dapat mengekspor seluruh data aplikasi ke JSON dan memulihkan backup dengan mode **overwrite** atau **merge**.
- Pengelolaan master juga mendukung import Excel/CSV. Dashboard SPV dan Manager menyediakan ekspor laporan Excel.
- Belum ada database relasional aktif. Tabel pada dokumen rancangan lama seperti `users`, `mst_line`, `trx_task`, dan `trx_task_item` **bukan** skema database yang dipakai aplikasi saat ini.

## Dashboard dan pelaporan

### Admin

- CRUD master rak, material, line/proses, dan pengguna.
- Pengaturan status aktif/nonaktif; penghapusan akun menghapusnya dari data aplikasi.
- Generator QR untuk rak, material, dan line; pemilihan kategori, pratinjau, dan cetak massal.
- Tampilan event log dalam bentuk timeline atau tabel, dengan pencarian/filter event.
- Ekspor dan pemulihan backup JSON; import master dan template Excel.

### SPV

- Kartu ringkasan task aktif, jumlah item in-transit/delivered, rata-rata lead time, alert keterlambatan, serta jumlah fallback.
- Grid item dengan status, mode keberangkatan, T1, T2, dan lead time.
- Filter shift, line, operator, serta pencarian berdasarkan material, rak, atau operator.
- Tab grafik/analitik dan ekspor laporan Excel.
- Timeline log kronologis terperinci berada pada tampilan Admin, bukan tampilan SPV.

### Manager

- KPI volume delivered, rata-rata delivery lead time, round-trip estimate, fulfillment, dan on-time compliance.
- Grafik/analitik, distribusi volume per line, serta drill-down performa operator.
- Filter shift dan ekspor laporan Excel (`.xlsx`); ekspor PDF belum tersedia.

## Status dan mode item

- Status task: `new`, `active`, `completed`, `cancelled`.
- Status item: `PICKED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`.
- Mode keberangkatan: `MANUAL_PRESS`, `AUTO_FALLBACK`.

## Batasan dan hal yang perlu diperhatikan

- Aplikasi saat ini adalah aplikasi sisi klien dengan penyimpanan lokal; tidak ada sinkronisasi multi-user/perangkat, API, atau database server.
- Login dan pemeriksaan role dikerjakan di sisi klien. Jangan gunakan implementasi ini sebagai sistem autentikasi/otorisasi produksi tanpa backend yang aman.
- Password staf pada model aplikasi disimpan sebagai nilai biasa di data browser, bukan hash server-side. Kredensial contoh hanya untuk keperluan demo; ubah/ jangan gunakan kredensial tersebut untuk lingkungan produksi.
- Karena data berada di browser, pengguna/perangkat yang berbeda dapat memiliki dataset berbeda.
- Timer auto-confirm keberangkatan, pencatatan T3 melalui scan rak, ekspor PDF, serta timeline event pada dashboard SPV belum tersedia.
- Nilai KPI tergantung data yang tersimpan di browser dan sebagian dapat berupa data contoh awal.

## Struktur source utama

```text
src/
├── App.tsx                     # routing tampilan, login, alur task, RBAC sisi klien
├── components/                 # header, scanner, modal import/export, QR print, grafik
├── types/index.ts              # tipe pengguna, master, task, item, dan event log
├── utils/storage.ts            # seed data, localStorage, helper shift/durasi
└── views/                      # tampilan login, operator, Admin, SPV, dan Manager
```

---

Dokumen diperbarui agar mencerminkan implementasi aplikasi pada branch `main`. Fitur yang belum ada dijelaskan sebagai batasan, bukan sebagai acceptance criteria yang sudah terpenuhi.
