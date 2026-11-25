# Product Requirements Document (PRD): StickyPlan (Web Itinerary Mobile-First)

**Status:** Draft v1.0 (Siap Eksekusi MVP)  
**Target Deployment:** Static Web App / PWA (GitHub + Cloudflare Pages — 100% Gratis)  
**Pendekatan Teknis:** Offline-First, Client-Side Only (Zero Backend Cost)

---

## 0. Catatan Kritis & Blind Spot yang Dikunci

Sebelum masuk ke spesifikasi, ada **3 blind spot utama** dari konsep awal yang langsung dikunci di PRD ini agar tidak menjadi masalah saat dipakai di lapangan:

* **Risiko Hilang Data di Static Web:** Menyimpan data hanya di browser (`localStorage`/`IndexedDB`) tanpa backend berarti data bisa terhapus otomatis saat *clear cache* atau ganti perangkat. MVP wajib menyertakan fitur **Export/Import JSON** dan **Backup teks** sebagai jaring pengaman.
* **Jebakan Estetika Sticky Note di Layar HP:** Metafora *sticky note* sering mengorbankan ruang layar dengan margin tebal, *font* dekoratif, dan *drop shadow* berlebihan. Di layar mobile, kepadatan informasi dan keterbacaan jam harus menang di atas dekorasi kertas.
* **Navigasi "Next" Saja Tidak Cukup:** Jika trip berdurasi 7 hari, menekan "Next" 6 kali untuk melompat ke hari terakhir itu melelahkan. Navigasi wajib mendukung **Next/Prev, Swipe kiri-kanan, dan Date Pill Strip** (loncat langsung ke tanggal tujuan).

---

## 1. Fondasi Produk & Asumsi Kritis (Discovery)

| Aspek | Keputusan & Asumsi Terkunci |
| :--- | :--- |
| **Masalah Utama** | Itinerary yang disimpan di PDF, WhatsApp, atau Google Docs berantakan saat dibaca terburu-buru di layar HP—harus *zoom-in*, *scroll* panjang mencari tanggal hari ini, dan repot menyalin alamat ke Google Maps. |
| **Pengguna Utama** | Pelaku perjalanan dinas dan pelancong solo/grup dengan literasi digital menengah-tinggi yang mengakses jadwal 95% lewat smartphone. |
| **Workaround Saat Ini** | Membuka pesan WhatsApp yang di-*pin*, *screenshot* tabel jadwal, atau catatan polos di Apple Notes / Google Keep. |
| **Lingkungan Pakai** | Layar HP 1 tangan (*one-handed use*), sering digunakan saat berjalan, di bandara/stasiun, atau lokasi dengan sinyal internet lemah/mati (wajib **Offline-First**). |
| **Core Loop (Aksi Inti)** | Buka aplikasi → langsung mendarat di lembar tanggal hari ini → cek jam & kegiatan berikutnya → klik kegiatan untuk baca detail atau buka Google Maps (target selesai kurang dari 5 detik). |
| **Sumber & Kepemilikan Data** | Diinput manual oleh pengguna di perangkat sendiri. Data tersimpan lokal di browser pengguna (*single-user ownership*). |
| **Risiko Terbesar** | Data jadwal hilang akibat *browser storage* terhapus, atau link Google Maps yang diinput salah/rusak saat pengguna sudah di jalan. |
| **Integrasi Eksternal** | Tanpa API berbayar. Integrasi Google Maps menggunakan **external deep-link URL** (`https://maps.google.com/...` atau `maps.app.goo.gl/...`) yang membuka aplikasi Google Maps bawaan HP. |
| **Batasan Rilis** | Biaya infrastruktur Rp0 (GitHub + Cloudflare Pages Free Tier). Tidak ada server backend atau database cloud pada MVP v1.0. |
| **Metrik Kesuksesan** | 1) Waktu buka aplikasi hingga konten tampil (FCP) kurang dari 1 detik; 2) Bisa dibuka 100% tanpa internet setelah kunjungan pertama; 3) Pengguna bisa menambah 1 item jadwal dalam waktu kurang dari 15 detik. |

---

## 2. Profil Pengguna, User Stories, & Acceptance Criteria

### User Persona

1. **Raka (33, Pegawai / Pelaku Perjalanan Dinas)**
   * **Kebiasaan:** Sering berpindah lokasi rapat dan hotel dalam 2–4 hari. Mengakses jadwal sambil membawa tas/koper dengan satu tangan.
   * **Pain Points:** Rundown acara biasanya berupa PDF lampiran undangan yang hurufnya terlalu kecil di HP dan tidak memuat tautan lokasi yang bisa langsung diklik.
   * **Ekspektasi:** Tampilan bersih, jam kegiatan langsung terlihat jelas, dan tombol rute Google Maps bisa diklik dalam 2 ketukan.

2. **Nadia (28, Pelancong Mandiri / Weekend Traveler)**
   * **Kebiasaan:** Menyusun daftar kafe, tempat makan, dan jadwal kereta per hari sebelum berangkat.
   * **Pain Points:** Catatan di Notes terlalu panjang untuk di-*scroll* dari Hari 1 sampai Hari 4, sehingga sering terlewat catatan kecil seperti nomor kursi atau kode *booking*.
   * **Ekspektasi:** Pembagian per hari terasa seperti kartu/lembar terpisah yang rapi, mudah digeser ke hari berikutnya, dan deskripsi panjang tersembunyi rapi sampai dibutuhkan.

### User Stories & Acceptance Criteria

1. **Navigasi Lembar Tanggal**
   * **Story:** Sebagai pengguna di perjalanan, saya ingin melihat jadwal terpisah 1 lembar untuk 1 tanggal dan bisa berpindah dengan tombol Next/Prev atau geser layar, supaya saya fokus hanya pada agenda hari itu tanpa terdistraksi hari lain.
   * **Acceptance Criteria:**
     * Setiap lembar hanya menampilkan daftar kegiatan milik 1 tanggal aktif.
     * Tersedia tombol Prev/Next, gestur *swipe* kiri/kanan, dan bar tanggal cepat (*date jump*).
     * Jika pengguna membuka aplikasi pada tanggal yang cocok dengan salah satu lembar di trip aktif, aplikasi otomatis membuka lembar tanggal hari tersebut.

2. **Pembuatan & Pengurutan Item Itinerary**
   * **Story:** Sebagai penyusun jadwal, saya ingin menambahkan kegiatan dengan jam, judul, deskripsi opsional, dan link Google Maps, supaya seluruh jadwal tersusun otomatis secara kronologis.
   * **Acceptance Criteria:**
     * Form input mewajibkan Jam (`HH:mm`, format 24 jam) dan Judul Kegiatan (maksimal 80 karakter).
     * Deskripsi dan Link Google Maps bersifat opsional.
     * Setelah disimpan, daftar kegiatan pada tanggal tersebut otomatis terurut dari jam paling awal ke paling akhir.

3. **Accordion Detail Kegiatan & Akses Google Maps**
   * **Story:** Sebagai pengguna di lapangan, saya ingin mengetuk judul kegiatan untuk membuka dropdown deskripsi dan tombol Google Maps, supaya tampilan daftar tetap ringkas namun detail tetap cepat diakses.
   * **Acceptance Criteria:**
     * Secara default, semua item tampil ringkas (hanya Jam, Judul Kegiatan, dan indikator ikon peta jika ada link Maps).
     * Mengetuk baris kegiatan membuka/menutup panel detail secara mulus (*accordion*).
     * Jika link Google Maps tersedia, muncul tombol aksi jelas ("Buka di Google Maps") yang membuka URL di tab baru / aplikasi Maps eksternal.

4. **Akses Offline (PWA)**
   * **Story:** Sebagai pelancong di area minim sinyal, saya ingin seluruh jadwal tetap bisa dibuka dan diedit tanpa koneksi internet, supaya saya tidak kehilangan akses rundown di pesawat, kereta, atau basement gedung.
   * **Acceptance Criteria:**
     * Aplikasi terdaftar sebagai Progressive Web App (PWA) dengan *Service Worker* aktif dan bisa di-install ke *Home Screen* HP.
     * Mematikan koneksi internet (Mode Pesawat) tidak merusak tampilan maupun kemampuan baca/tulis jadwal yang sudah ada.

5. **Backup & Pemulihan Data (Export/Import)**
   * **Story:** Sebagai pengguna aplikasi tanpa login, saya ingin mengekspor dan mengimpor jadwal dalam format file JSON, supaya data saya aman jika browser ter-reset atau ingin dipindah ke perangkat lain.
   * **Acceptance Criteria:**
     * Pengguna dapat mengunduh 1 file `.json` berisi seluruh data trip dan tanggal.
     * Pengguna dapat mengunggah file `.json` tersebut untuk memulihkan data dengan validasi struktur sebelum menimpa/menggabungkan data lama.

---

## 3. Matriks Prioritas Fitur MVP (Kontrol Scope Creep)

### Wajib untuk MVP (Terkunci Maksimal 5 Fitur Inti)

| No | Fitur Inti MVP | Alasan Pemilihan |
| :--- | :--- | :--- |
| **1** | **Lembar Tanggal (Sticky Card per Hari)** | Identitas utama produk: 1 lembar = 1 tanggal, navigasi Next/Prev, *swipe*, dan indikator posisi hari (misal: Hari 1 dari 3). |
| **2** | **CRUD Item Itinerary + Auto-Sort Jam** | Fungsi inti pencatatan: tambah, edit, hapus kegiatan (Jam, Judul, Deskripsi, Link Maps) yang otomatis rapi berdasarkan urutan waktu. |
| **3** | **Accordion Detail & Deep-Link Google Maps** | Menjaga layar HP tetap lega seperti daftar *sticky note* sambil memberi akses instan ke catatan panjang dan navigasi peta. |
| **4** | **Offline-First Storage & PWA Installable** | Syarat mutlak aplikasi perjalanan gratis tanpa backend agar andal saat tidak ada sinyal dan terasa seperti aplikasi native di HP. |
| **5** | **Export / Import Data (JSON)** | Mitigasi wajib atas ketiadaan server/database cloud agar pengguna tidak kehilangan data secara permanen. |

### Bagus Kalau Ada (Iterasi v1.1)
* **Multi-Trip Switcher:** Memisahkan beberapa perjalanan berbeda (misal: "Dinas Bandung Nov" dan "Liburan Bali Des").
* **Status Real-Time ("Sedang Berlangsung"):** Menyorot otomatis item kegiatan berdasarkan jam sistem saat ini.
* **Checklist / Coret Selesai:** Menandai kegiatan yang sudah dilewati agar visual lebih lega.
* **Kustomisasi Warna Kertas Sticky Note:** Pilihan palet warna pastel lembut (kuning kertas, mint, krem, biru muda) per hari atau mode gelap (*Dark Mode*).
* **Copy as Text (Format WhatsApp):** Salin seluruh jadwal 1 hari menjadi teks rapi siap kirim ke grup WA.

### Nanti Dulu (Out of Scope)
* Login pengguna (Google OAuth) dan sinkronisasi database cloud real-time.
* Kolaborasi multi-user (edit bersama secara bersamaan).
* Embed peta interaktif Google Maps API (berisiko tagihan kartu kredit jika kuota habis).
* Notifikasi *push* / alarm otomatis di latar belakang.
* Pencatatan biaya perjalanan (*budget/expense tracker*).

---

## 4. Arsitektur Alur, UI/UX, Skema Data, & NFR

### Core User Flow

**Alur A: Membaca Jadwal & Cek Lokasi (Di Lapangan)**
1. Pengguna membuka ikon PWA di *Home Screen* HP.
2. Sistem mengecek tanggal sistem hari ini; jika cocok dengan data trip, langsung tampilkan lembar tanggal tersebut (jika tidak, tampilkan lembar tanggal terdekat/pertama).
3. Pengguna melihat kartu *sticky note* berisi daftar `Jam — Judul Kegiatan`.
4. Pengguna mengetuk satu kegiatan (misal: `10:00 Rapat dimulai`).
5. Panel *accordion* terbuka menampilkan deskripsi lengkap dan tombol `Buka di Google Maps`.
6. Pengguna mengetuk tombol Maps → aplikasi Google Maps bawaan HP terbuka langsung ke titik tujuan.
7. Untuk melihat hari esok, pengguna *swipe* ke kiri atau mengetuk tombol `Next` di area bawah (*thumb zone*).

**Alur B: Menambah Kegiatan Baru**
1. Pada lembar tanggal aktif, pengguna mengetuk tombol `+ Tambah Kegiatan` (*Floating Action Button* atau tombol di bagian bawah kartu).
2. *Bottom Sheet* (drawer dari bawah layar, bukan pop-up di atas) muncul dengan form: Jam, Judul, Deskripsi, dan Link Maps.
3. Pengguna mengisi Jam dan Judul, lalu menempel (*paste*) link Maps jika ada.
4. Pengguna mengetuk `Simpan`.
5. Sistem memvalidasi input, menyimpan ke penyimpanan lokal, menutup *Bottom Sheet*, dan menyisipkan item pada posisi urutan jam yang tepat.

### Daftar Halaman (Screens) & Best Practice UI/UX Mobile

Aplikasi cukup menggunakan arsitektur **Single Page Application (SPA) 1 Layar Utama + 2 Bottom Sheet** agar sangat ringan:

1. **Layar Utama (Sticky Sheet View):**
   * **Top Bar (Compact):** Nama Trip (bisa diklik untuk ganti/edit judul trip) dan ikon Menu/Pengaturan (Export/Import).
   * **Date Navigation Strip:** Deretan *pill* tanggal horizontal yang bisa di-*scroll* (misal: `25 Nov`, `26 Nov`, `27 Nov`) + tombol `+ Tanggal`.
   * **Sticky Note Card (Area Utama):** Kartu dengan sudut membulat lembut, *header* tanggal besar (misal: **Rabu, 25 Nov 2026**), latar bernuansa kertas lembut ber-kontras tinggi (WCAG AA minimal 4.5:1), dan daftar baris kegiatan.
   * **Struktur Baris Kegiatan:** Kolom kiri jam dengan *font monospace/tabular-nums* (`09:00`) agar sejajar vertikal rapi; kolom kanan judul kegiatan + ikon kecil pin lokasi (jika ada link Maps) + panah *chevron*.
   * **Bottom Navigation Bar (Thumb Zone):** Tombol `Prev` di kiri, tombol utama `+ Kegiatan` di tengah, dan `Next` di kanan. Semua area klik minimal **44×44 px** agar mudah dijangkau ibu jari.
2. **Bottom Sheet: Form Tambah / Edit Kegiatan:**
   * Menggunakan *native time picker* HTML (`<input type="time">`) agar nyaman di Android/iOS.
   * Tombol `Hapus Kegiatan` ditempatkan terpisah dengan konfirmasi 2 langkah untuk mencegah salah pencet.
3. **Bottom Sheet: Kelola Data & Tanggal:**
   * Aksi Export JSON, Import JSON, dan Hapus Lembar Tanggal.

### Skema Data Awal

Walaupun di MVP disimpan secara lokal menggunakan **IndexedDB** (atau `localStorage` dengan struktur JSON terversioning), skema dirancang relasional agar mudah dimigrasi ke database cloud (Supabase/Firebase/D1) di masa depan:

#### 1. Koleksi / Tabel `trips`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string (UUID v4)` | **Primary Key** |
| `title` | `string` | Judul trip (default: "Itinerary Saya", maks 60 karakter) |
| `schema_version` | `integer` | Versi struktur data (default: `1`) untuk migrasi aman |
| `created_at` | `string (ISO 8601)` | Waktu pembuatan |
| `updated_at` | `string (ISO 8601)` | Waktu pembaruan terakhir |

#### 2. Koleksi / Tabel `day_sheets`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string (UUID v4)` | **Primary Key** |
| `trip_id` | `string (UUID v4)` | **Foreign Key** merujuk ke `trips.id` |
| `date` | `string (YYYY-MM-DD)` | Tanggal unik per trip (Unique constraint: `trip_id + date`) |
| `note_color` | `string` | Kode tema kartu (default: `"warm-yellow"`) |
| `day_summary` | `string (nullable)` | Catatan singkat opsional di header tanggal (misal: "Hari 1: Kedatangan") |

#### 3. Koleksi / Tabel `itinerary_items`
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string (UUID v4)` | **Primary Key** |
| `day_sheet_id` | `string (UUID v4)` | **Foreign Key** merujuk ke `day_sheets.id` |
| `start_time` | `string (HH:mm)` | Jam mulai format 24 jam (indeks pengurutan utama) |
| `title` | `string` | Nama kegiatan (wajib, maks 80 karakter) |
| `description` | `string (nullable)` | Penjelasan detail kegiatan (maks 1.000 karakter) |
| `maps_url` | `string (nullable)` | URL valid Google Maps |
| `sort_order` | `integer` | Penentu urutan sekunder jika ada 2 kegiatan di jam yang sama |
| `created_at` | `string (ISO 8601)` | Waktu pembuatan |

### Non-Functional Requirements (NFR), Arsitektur, & Keamanan

* **Tech Stack Rekomendasi (Gratis & Ringan):**
  * **Frontend:** Vanilla HTML/CSS/JS (ES Modules) atau Preact/React + Vite + Tailwind CSS. Hasil *build* berupa file statis di folder `dist/`.
  * **Hosting & CI/CD:** Repository GitHub terhubung langsung ke **Cloudflare Pages** (auto-deploy setiap `git push`).
  * **Storage:** `localStorage` cukup untuk MVP (kapasitas ~5MB bisa menampung ribuan kegiatan teks), dibungkus dalam *storage service layer* terpisah agar mudah diganti ke IndexedDB atau Cloud DB tanpa merombak kode UI.
* **Performa:**
  * Ukuran bundle awal kurang dari 150 KB (gzipped).
  * Animasi transisi *accordion* dan *swipe* hanya memanipulasi properti GPU-friendly (`transform`, `opacity`) agar mulus 60 FPS di HP kelas menengah.
* **Keamanan Client-Side (Best Practice Wajib):**
  * **Zero `innerHTML`:** Seluruh teks dari input pengguna atau hasil Import JSON wajib dirender menggunakan `textContent` (jika Vanilla JS) atau *auto-escaping* JSX (jika React/Preact) untuk menutup celah Cross-Site Scripting (XSS).
  * **Sanitasi & Whitelist URL Maps:** Sebelum merender tombol Google Maps, sistem wajib memvalidasi lewat objek `new URL()`. Tolak protokol selain `https:` (mencegah injeksi `javascript:alert(1)`). Hanya izinkan host terkait Google Maps (`google.com`, `maps.google.com`, `goo.gl`, `maps.app.goo.gl`) atau fallback otomatis ke pencarian Google Maps aman: `https://www.google.com/maps/search/?api=1&query=<encoded_text>`.
  * **External Link Safety:** Setiap tautan eksternal wajib memiliki atribut `target="_blank" rel="noopener noreferrer"`.
  * **Validasi Skema Import JSON:** File JSON yang diimpor wajib divalidasi tipe data, panjang karakter, dan *whitelist* propertinya (mencegah *prototype pollution* seperti `__proto__` atau data korup yang membuat aplikasi *blank screen*).
  * **Security Headers (Cloudflare Pages):** Tambahkan file `_headers` di root proyek berisi `Content-Security-Policy` (CSP), `X-Content-Type-Options: nosniff`, dan `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 5. Stress-Test "Reviewer Galak" & Mitigasi MVP

| Kategori Celah | Skenario Kegagalan Nyata | Solusi Mitigasi Konkret di MVP |
| :--- | :--- | :--- |
| **1. Edge Cases & Human Error** | Pengguna menempel teks mentah hasil *Share* dari Google Maps (misal: `"Grand Indonesia https://maps.app.goo.gl/xyz"`) ke kolom link Maps, sehingga validasi URL gagal atau link rusak saat diklik. | Buat *parser* pintar di input Link Maps: otomatis ekstrak URL `https://...` jika ada di dalam teks tempelan. Jika yang ditempel hanya nama tempat tanpa link, tawarkan otomatis mengonversinya menjadi tautan pencarian Google Maps yang valid. |
| **2. Risiko Kehilangan Data** | Pengguna sudah mengisi jadwal 5 hari, lalu tidak sengaja menekan *Clear Browsing Data* di Chrome atau HP-nya mati total dan harus pinjam HP lain. | Tampilkan indikator halus "Terakhir di-backup: Belum pernah" di menu pengaturan dan sediakan tombol 1-klik **Export JSON** + **Salin Teks Jadwal**. Simpan juga *auto-backup* ke `localStorage` dengan penanganan `QuotaExceededError` yang memberi peringatan jelas. |
| **3. Keamanan & Integritas Data** | Pengguna mengimpor file JSON rusak atau dimodifikasi pihak lain yang berisi skrip berbahaya di kolom `description` atau `maps_url`, menyebabkan aplikasi *crash* permanen saat dibuka. | Terapkan *strict schema validator* sebelum menulis data impor ke storage. Jika validasi gagal, tolak impor dan tampilkan pesan error spesifik tanpa menghapus data lama. Bungkus pembacaan storage dengan `try-catch` dan sediakan tombol *Reset Safe Mode* jika data lokal korup. |
| **4. Ambiguitas Logika Bisnis** | 1) Pengguna punya kegiatan di tanggal 25 dan 27, tapi tanggal 26 kosong—apakah tombol `Next` lompat ke 27 atau ke lembar kosong 26? 2) Dua kegiatan punya jam sama (`12:00`). 3) Menghapus tanggal yang masih punya 5 kegiatan. | 1) Tombol `Next`/`Prev` berpindah berdasarkan **lembar tanggal yang terdaftar** (25 langsung ke 27), sementara menambah tanggal 26 dilakukan via tombol `+ Tanggal` agar pengguna tidak terjebak halaman kosong tak berujung. 2) Gunakan `sort_order` sebagai pemecah seri jam yang sama. 3) Hapus tanggal wajib memunculkan dialog konfirmasi yang menyebut jumlah kegiatan yang akan ikut terhapus. |