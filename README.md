# ZEVA Logistik Material - Operator Tracking v1.6

## 1. Ringkasan System

Sistem ZEVA Logistik Material dirancang untuk memantau aktivitas operator saat mengambil material dari rak, membawa material ke proses/line produksi, dan mencatat perjalanan kerja dari awal hingga selesai secara real-time.

Versi v1.6 menyesuaikan kebutuhan operasional Lean Manufacturing & Gemba UX:

* **Fast-Track Login & Auto-Create Operator:** Operator login menggunakan QR Code atau ID Karyawan. Jika ID belum ada, sistem otomatis membuat akun baru dan langsung mengarahkan (*direct routing*) ke **Panel Input Task Baru**. Jika ID sudah ada, sistem mengarahkan ke **Dashboard History Task**.

* **Role-Based Access Control (RBAC):** Memisahkan otorisasi dan antarmuka antara Admin, Supervisor (SPV), Manager, dan Operator.

* **Completion Scan Verification:** Penyerahan material wajib divalidasi dengan melakukan scan QR Code Nama Proses/Line yang fisik-nya tertempel di lokasi tujuan.

* **Poka-Yoke Auto-Departure Fallback:** Jika operator lupa menekan tombol "Konfirmasi Berangkat" dan langsung melakukan scan QR Code di lokasi tujuan, sistem secara otomatis menetapkan waktu keberangkatan ($T1$) berdasarkan waktu scan material terakhir, menandainya dengan flag `AUTO_FALLBACK` tanpa menghentikan alur pengiriman.

* **Precision Time & Route Tracking (Spatiotemporal Log):** Mencatat stempel waktu presisi ($T1$ Picked/Departure, $T2$ Delivered di lokasi, $T3$ Return to Rack) untuk menghitung *Delivery Lead Time*, *Transit Time*, dan *Return Time* baik pada skenario pengiriman tunggal, *multi-drop*, maupun *bulk delivery*.

## 2. Tujuan Sistem

1. Memungkinkan operator login instan tanpa hambatan administrasi awal (*zero waiting onboarding*).

2. Memangkas *lead time* input task awal bagi operator baru dengan langsung membuka form operasional.

3. Mencatat waktu aktual perjalanan pengiriman (*Delivery Lead Time*) dan waktu kembali (*Return Time*) secara presisi berbasis scan QR Code di lokasi tujuan.

4. Mengantisipasi kesalahan manusia (*human error*) di lapangan seperti lupa menekan tombol keberangkatan melalui mekanisme *Poka-Yoke Fallback*.

5. Memisahkan hak akses dan bentuk tampilan sesuai fungsi kerja (Admin, SPV, Manager, Operator).

6. Menyediakan data audit kronologis (*Spatiotemporal Event Log*) untuk analisis *bottleneck*, beban kerja operator, *travel time*, dan efisiensi suplai material ke lini produksi.

## 3. Role & Otorisasi Akses

### 3.1 Admin

* **Metode Login:** Username & Password manual.

* **Fokus Utama:** Pengelolaan konfigurasi sistem, data master, hak akses, dan audit trail.

* **Akses:**

  * Pengelolaan Master Data (Rak, Material, Line/Proses).

  * Generator & Bulk Printing QR Code (Rak, Material, dan QR Code Lokasi Proses).

  * User Management (edit nama operator, reset status, *soft delete* ID salah ketik).

  * Akses penuh ke System Log & Database Raw Export.

### 3.2 SPV (Supervisor)

* **Metode Login:** Username & Password manual.

* **Fokus Utama:** Monitoring operasional real-time, penanganan *delay/bottleneck*, dan kontrol siklus shift.

* **Akses:**

  * Live Monitoring Grid (Operator in-transit status & delay alerts).

  * Identifikasi mode keberangkatan operator (`MANUAL_PRESS` vs `AUTO_FALLBACK` flag).

  * Chronological Event Timeline per operator, per task, dan per item.

  * Detail breakdown log waktu ($T1, T2, T3$) dan tracking rute pengiriman.

  * Filter monitoring berdasarkan Shift, Line Tujuan, Operator, dan Kode Material.

### 3.3 Manager

* **Metode Login:** Username & Password manual.

* **Fokus Utama:** Dashboard KPI, evaluasi performa, dan laporan strategis eksekutif.

* **Akses:**

  * High-level KPI summary (*Total Volume Delivered*, *Avg Round-Trip Time*, *Fulfillment Rate*).

  * Grafik tren efisiensi *cycle time* per shift/hari/minggu.

  * Drill-down analisis performa individu operator dan distribusi beban kerja per area line.

  * Modul cetak/export laporan eksekutif (PDF/Excel).

### 3.4 Operator

* **Metode Login:** Scan QR Code / Barcode ID Karyawan atau input manual ID.

* **Fokus Utama:** Input task operasional cepat di lapangan (*Gemba*).

* **Akses:**

  * User Baru: Direct access ke **Panel Input Task**.

  * User Lama: Direct access ke **Dashboard History Task** (dengan opsi "Lanjut Task" atau "+ Task Baru").

  * Menjalankan scan rak asal, scan material, input qty, dan scan QR Code lokasi tujuan.

## 4. Prinsip Tracking & Kalkulasi Waktu (Cycle Time Metrics)

Sistem mencatat 3 stempel waktu utama (*timestamps*) dalam 1 siklus pengiriman material:

1. **`T1` - Picked / Departure Time:** Waktu saat operator selesai scan rak & material di area gudang/rak (Awal Perjalanan Berangkat).
   * *Fallback Logic:* Jika operator tidak menekan tombol berangkat, $T1$ diisi otomatis menggunakan waktu scan material terakhir (`last_material_scanned_at`).

2. **`T2` - Delivered Time (Completion Scan):** Waktu saat operator tiba di lokasi dan **scan QR Code fisik yang tertempel di stasiun/line tujuan**.

3. **`T3` - Return / Next Cycle Start:** Waktu saat operator kembali ke area gudang dan melakukan scan rak untuk siklus/task berikutnya.

### Formulasi Kalkulasi Otomatis:

* **Delivery Lead Time (Waktu Kirim):** $T_2 - T_1$

* **Return Lead Time (Waktu Kembali):** $T_3 - T_2$

* **Total Round-Trip Cycle Time:** $T_3 - T_1$

* **Inter-Line Transit Time (Skenario Multi-Drop):** $T_{2b} - T_{2a}$

## 5. Flow Kerja & Skenario Pengiriman

### 5.1 Alur Logika Routing Login Operator

```
            [ Operator Scan QR / Input ID Karyawan ]
                               │
                       ┌───────┴───────┐
                       ▼               ▼
                 [ User Baru ]   [ User Lama ]
                       │               │
      ┌────────────────┴┐              └─► Redirect ke:
      │ Auto-create User │                  [ Dashboard History ]
      │ Auto-create Task │                  - Lihat task aktif
      └────────┬────────┘                   - Opsi "Lanjut" / "Task Baru"
               ▼
     Redirect Direct ke:
    [ Panel Input Task ]
```

### 5.2 Skenario Pengiriman Material & Logika Verification Scan

#### Skenario A: Single Material $\to$ Single Line (Standard vs Auto-Departure)

1. Operator scan Rak Asal $\to$ Scan Material $\to$ Input Qty $\to$ Pilih Target Line.

2. **Jalur Normal:** Operator tekan **Konfirmasi Berangkat** $\to$ System set status item `IN_TRANSIT`, simpan `T1` (`MANUAL_PRESS`).
   * **Jalur Fallback (Lupa Tekan):** Operator langsung membawa barang ke line dan melakukan scan QR Code tujuan. System otomatis mengambil timestamp scan material terakhir sebagai $T1$ dan menyimpannya dengan flag `AUTO_FALLBACK`.

3. Operator membawa material ke lokasi tujuan $\to$ **Scan QR Code fisik di Line Tujuan**.

4. System validasi matching QR Code $\to$ System set status item `DELIVERED`, simpan `T2` ($T_2 - T_1 = \text{Delivery Time}$).

5. Operator kembali ke gudang & scan rak baru $\to$ System simpan `T3` ($T_3 - T_2 = \text{Return Time}$).

#### Skenario B: Multi-Material $\to$ Single Line (Bulk Delivery)

1. Operator scan Rak A12 (Mat X), Rak B08 (Mat Y), Rak C05 (Mat Z) dengan target tujuan sama (Line 1).

2. Operator berangkat $\to$ System simpan `T1` awal keberangkatan.

3. Operator tiba di Line 1 $\to$ **Cukup 1x Scan QR Code fisik Line 1**.

4. System secara otomatis mengubah status seluruh item (Mat X, Y, Z) dalam task tersebut menjadi `DELIVERED` dengan stempel `T2` yang identik.

#### Skenario C: Multi-Drop (Banyak Material $\to$ Banyak Line Berbeda)

1. Operator scan Mat X (Target: Line A) dan Mat Y (Target: Line B) di gudang $\to$ System simpan `T1`.

2. Operator tiba di Line A $\to$ **Scan QR Code Line A** $\to$ System set Mat X `DELIVERED` ($T2a$).

3. Operator berjalan ke Line B $\to$ **Scan QR Code Line B** $\to$ System set Mat Y `DELIVERED` ($T2b$).

4. System menghitung Transit Time antar-line ($T2b - T2a$).

5. Operator kembali ke gudang & scan rak baru $\to$ System simpan `T3`.

## 6. Desain Antarmuka & UX Panel Input Operator

### 6.1 Visual Wireframe Panel Input (Tablet/Touchscreen Friendly)

```
+-------------------------------------------------------------+
|  ZEVA LOGISTIK MATERIAL                       [OP-07] Logout|
|  Task: T-20261030-001 | Shift 1 | Status: Active            |
+-------------------------------------------------------------+
|                                                             |
|  [ STEP 1: SCAN RAK ASAL ]                                  |
|  +-------------------------------------------------------+  |
|  | Kode Rak: [  RAK-A12  ] (✓ Valid)                     |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [ STEP 2: SCAN MATERIAL ]                                  |
|  +-------------------------------------------------------+  |
|  | Kode Material: [  MAT-001  ]                          |  |
|  | Deskripsi: Baut M6x20 Stainless Steel (✓ Valid)         |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  [ STEP 3: JUMLAH & TUJUAN ]                                |
|  +---------------------------+ +-------------------------+  |
|  | Qty: [ 20 ] Satuan: [Pcs] | | Target: [  LINE-1  ]    |  |
|  +---------------------------+ +-------------------------+  |
|                                                             |
|  [  + TAMBAH MATERIAL (ENTER)  ]                            |
|                                                             |
+-------------------------------------------------------------+
|  Daftar Material dalam Troli Task Ini (2 Item)              |
|  1. RAK-A12 | MAT-001 (20 Pcs) -> LINE-1   [ Batal / Hapus ]|
|  2. RAK-B08 | MAT-004 (15 Pcs) -> LINE-2   [ Batal / Hapus ]|
+-------------------------------------------------------------+
|  [  ✓ KONFIRMASI BERANGKAT (Auto-Confirm 5s)  ]             |
+-------------------------------------------------------------+
```

### 6.2 Modal POP-UP Completion (Verifikasi Scan Tujuan)

```
+-------------------------------------------------------------+
|  [ MODAL VERIFIKASI SELESAI KIRIM ]                         |
|  +-------------------------------------------------------+  |
|  |  SILAKAN SCAN QR CODE NAMA PROSES DI LOKASI TUJUAN   |  |
|  |                                                       |  |
|  |  Scan Target QR: [  LINE-1-ASSY  ] (✓ Match & Valid)  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  Status: [✓] Material Berhasil Diserahkan (T2: 09:15:22)    |
|  Mode Departure: [AUTO_FALLBACK] (From Last Scan)           |
|  Travel Lead Time: 4 Menit 12 Detik                         |
|                                                             |
|  [  ✓ SELESAI & KEMBALI KE RAK  ]                           |
+-------------------------------------------------------------+
```

### 6.3 Fitur Poka-Yoke & UX Rules:

* **Auto-Focus & Hands-Free Auto-Advance:** Kursor otomatis aktif pada field input berurutan (Scan Rak $\to$ Scan Material $\to$ Target Line). Setelah barcode dibaca scanner, kursor melompat otomatis tanpa sentuhan layar.

* **Auto-Confirm Departure Timer:** Tombol "Konfirmasi Berangkat" memiliki *countdown* 5 detik. Jika operator langsung berjalan tanpa menekan tombol, sistem otomatis mengonfirmasi keberangkatan secara otomatis.

* **Audio & Visual Feedback:** Beep halus + border hijau untuk data valid. Beep peringatan (error tone) + border merah jika barcode salah/tidak aktif atau jika scan QR Code lokasi tujuan tidak cocok (*mismatch*).

* **Error Protection:** Item material sementara dalam troli dapat dihapus sebelum dikonfirmasi berangkat.

## 7. Desain Dashboard Web (Admin, SPV, & Manager)

### 7.1 Dashboard Admin (System Control & Master Data)

* **Menu Utama:**

  * Master Rak, Material, & Line/Proses.

  * QR Code Generator & Bulk Printing Module.

  * User Management (Auto-created Operator list, Soft-delete ID typo).

  * Audit Trail & Raw Database Logs (Termasuk pencatatan flag `AUTO_FALLBACK`).

### 7.2 Dashboard SPV (Live Monitoring & Timeline Event)

* **Metrics Summary Cards:** Task Active, Total Items Delivered Shift Ini, Average Delivery Lead Time, Delay Alerts, Total Auto-Departure Fallbacks.

* **Live Monitoring Grid:** Tabel status operator in-transit beserta status waktu (*On Time* vs *Overtime/Delay*) dan indikator mode keberangkatan.

* **Spatiotemporal Event Timeline:** Tampilan kronologis per detik perjalanan operator dari $T1 \to T2 \to T3$ untuk audit hambatan rute.

### 7.3 Dashboard Manager (Executive Summary & KPI)

* **KPI Overview:** Delivery Volume, Average Round-Trip Cycle Time, Fulfillment Rate (%).

* **Trend Charts:** Grafik pencapaian Lead Time vs Standard Target per Shift/Hari.

* **Workload & Route Analysis:** Distribusi persentase volume suplai material per area line.

* **Operator Performance Drill-Down:** Evaluasi performa individu operator berdasarkan *cycle time* dan efisiensi pengiriman.

## 8. Struktur Data Utama (Database Schema)

### 8.1 Tabel `users`

| Kolom | Tipe Data | Constraint / Default | Keterangan | 
| ----- | ----- | ----- | ----- | 
| `id` | BIGINT | PK, Auto Inc | Primary Key | 
| `employee_id` | VARCHAR(50) | UNIQUE, NOT NULL | ID Karyawan / NIK | 
| `nama` | VARCHAR(100) | NOT NULL | Nama Operator (Default: "Operator \[ID\]") | 
| `qr_code` | VARCHAR(100) | UNIQUE, NULLABLE | Nilai Scan QR | 
| `password_hash` | VARCHAR(255) | NULLABLE | Hash Password (Admin/SPV/Manager) | 
| `role` | ENUM | Default: `operator` | `admin`, `spv`, `manager`, `operator` | 
| `status` | ENUM | Default: `active` | `active`, `inactive` | 
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TS | Waktu pendaftaran otomatis | 
| `last_login_at` | TIMESTAMP | NULLABLE | Timestamp login terakhir | 

### 8.2 Tabel `mst_line` (Master QR Code Proses/Line)

| Kolom | Tipe Data | Constraint | Keterangan | 
| ----- | ----- | ----- | ----- | 
| `id` | BIGINT | PK, Auto Inc | Primary Key | 
| `kode_line` | VARCHAR(50) | UNIQUE, NOT NULL | Kode Unik Line (misal: `LINE-01`) | 
| `nama_line` | VARCHAR(100) | NOT NULL | Nama Proses (misal: `Assy Main Frame`) | 
| `qr_code_proses` | VARCHAR(100) | UNIQUE, NOT NULL | String QR Code yang tertempel di lokasi | 
| `area` | VARCHAR(50) | NOT NULL | Area Pabrik (misal: `Area A`) | 
| `status` | ENUM | Default: `active` | `active`, `inactive` | 

### 8.3 Tabel `trx_task`

| Kolom | Tipe Data | Constraint | Keterangan | 
| ----- | ----- | ----- | ----- | 
| `id` | BIGINT | PK, Auto Inc | Primary Key | 
| `user_id` | BIGINT | FK to `users.id` | ID Operator | 
| `task_no` | VARCHAR(50) | UNIQUE, NOT NULL | Nomor Task Unik (e.g. `T-20261030-001`) | 
| `tanggal` | DATE | NOT NULL | Tanggal Task | 
| `shift` | INT | NOT NULL | Shift Kerja (1, 2, 3) | 
| `status` | ENUM | Default: `new` | `new`, `active`, `completed`, `cancelled` | 
| `start_time` | TIMESTAMP | NULLABLE | Waktu Task Dimulai | 
| `end_time` | TIMESTAMP | NULLABLE | Waktu Task Diselesaikan | 

### 8.4 Tabel `trx_task_item`

| Kolom | Tipe Data | Constraint | Keterangan | 
| ----- | ----- | ----- | ----- | 
| `id` | BIGINT | PK, Auto Inc | Primary Key | 
| `task_id` | BIGINT | FK to `trx_task.id` | ID Task | 
| `user_id` | BIGINT | FK to `users.id` | ID Operator | 
| `rak_id` | BIGINT | FK to `mst_rak.id` | ID Rak Asal | 
| `material_id` | BIGINT | FK to `mst_material` | ID Material | 
| `qty` | INT | NOT NULL | Jumlah Material | 
| `satuan` | VARCHAR(20) | NOT NULL | Satuan (Pcs, Box, Crate) | 
| `line_id` | BIGINT | FK to `mst_line.id` | ID Line/Proses Tujuan | 
| `status` | ENUM | Default: `PICKED` | `PICKED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED` | 
| `departure_mode` | ENUM | Default: `MANUAL_PRESS` | `MANUAL_PRESS`, `AUTO_FALLBACK` | 
| `picked_at` | TIMESTAMP | NULLABLE | **T1:** Waktu scan rak & material di gudang | 
| `delivered_at` | TIMESTAMP | NULLABLE | **T2:** Waktu scan QR Code lokasi tujuan | 
| `return_at` | TIMESTAMP | NULLABLE | **T3:** Waktu kembali / scan siklus berikutnya | 
| `delivery_duration_sec` | INT | NULLABLE | Calculated: $T2 - T1$ (dalam detik) | 
| `return_duration_sec` | INT | NULLABLE | Calculated: $T3 - T2$ (dalam detik) | 

## 9. Logika Auto-Create & Verifikasi Tujuan (Pseudo-Code)

### 9.1 Login & Routing Operator

```
function onScanOperatorID(scanned_value):
    if length(scanned_value) < 3:
        return showError("ID Karyawan tidak valid!")

    user = findUserByEmployeeIdOrQR(scanned_value)
    
    if user exists:
        login(user)
        updateLastLogin(user.id)
        redirect_to('/operator/dashboard-history')
    else:
        new_user = createUser({
            employee_id: scanned_value,
            nama: 'Operator ' + scanned_value,
            qr_code: scanned_value,
            role: 'operator',
            status: 'active'
        })
        login(new_user)
        
        new_task = createNewTask({
            user_id: new_user.id,
            status: 'new',
            shift: getCurrentShift()
        })
        redirect_to('/operator/task-input/' + new_task.id)
```

### 9.2 Completion Scan Verification dengan Auto-Departure Fallback Logic

```
function onScanLocationTarget(scanned_qr_proses, task_id):
    active_items = getTaskItemsByTaskId(task_id)
    now = getCurrentTimestamp()
    
    matched_count = 0
    for item in active_items:
        target_line = getLineById(item.line_id)
        
        if scanned_qr_proses == target_line.qr_code_proses:
            // POKA-YOKE: Handle jika operator lupa tekan "Berangkat" (T1 is null)
            picked_time = item.picked_at
            dep_mode = item.departure_mode
            
            if picked_time == null:
                picked_time = item.last_material_scanned_at
                dep_mode = 'AUTO_FALLBACK'

            updateTaskItem(item.id, {
                status: 'DELIVERED',
                picked_at: picked_time,
                delivered_at: now,
                departure_mode: dep_mode,
                delivery_duration_sec: timestampDiffInSeconds(now, picked_time)
            })
            logEvent({
                task_id: item.task_id,
                task_item_id: item.id,
                event_type: 'delivered',
                notes: 'Penyerahan sukses di ' + target_line.nama_line + ' (Mode: ' + dep_mode + ')'
            })
            matched_count++

    if matched_count > 0:
        playSuccessBeep()
        showNotification("Penyerahan Berhasil! " + matched_count + " Item Delivered.")
        redirect_to('/operator/task-input/' + task_id + '?step=awaiting_return')
    else:
        playErrorBeep()
        showError("LOKASI SALAH! QR Code yang di-scan tidak sesuai dengan target pengiriman item ini.")
```

## 10. Acceptance Criteria

1. **Fast Onboarding:** Operator baru yang belum terdaftar di database yang melakukan scan ID pertama kali langsung dibuatkan akun dan **langsung masuk ke Panel Input Task**.

2. **History Routing:** Operator terdaftar yang melakukan scan ID langsung diarahkan ke **Dashboard History Task** untuk memilih task aktif atau membuat task baru.

3. **Mandatory Completion Scan:** Status item material tidak dapat berubah menjadi `DELIVERED` sebelum operator melakukan scan QR Code fisik yang terpasang di lokasi proses tujuan.

4. **Auto-Departure Fallback:** Jika operator lupa menekan tombol "Konfirmasi Berangkat", sistem tidak menggagalkan transaksi dan otomatis mengisi $T1$ menggunakan waktu scan material terakhir dengan tanda flag `AUTO_FALLBACK`.

5. **Error Proofing Matching:** Jika QR Code lokasi yang di-scan tidak sesuai dengan target line pada task item, sistem wajib menolak dan menampilkan pesan peringatan audio & visual.

6. **Precision Time Tracking:** System mencatat $T1$ (*Picked*), $T2$ (*Delivered*), dan $T3$ (*Return*) secara otomatis, serta menghitung durasi *Delivery Lead Time* dan *Return Time*.

7. **Multi-Drop & Bulk Support:** System mendukung pendaftaran $T2$ individual pada skenario *multi-drop* (beruntun) serta pendaftaran $T2$ serentak pada skenario *bulk delivery* ke 1 line.

8. **Role Isolation:** Akses Admin, SPV, Manager, dan Operator terisolasi secara ketat sesuai batasan RBAC.

Versi Dokumen: **1.6**  
Tanggal: **30 Oktober 2026**  
Status: **Spesifikasi Final Operasional + Poka-Yoke Auto-Departure Fallback & Spatiotemporal Time Tracking**