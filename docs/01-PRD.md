# Product Requirements Document (PRD): StickyPlan v2.0 (Final)

**Nama Produk:** StickyPlan — Mobile-First Web Itinerary  
**Versi Dokumen:** 2.0 (Final — Diselaraskan dengan Prototipe Tervalidasi)  
**Status:** Siap Pengembangan Produksi (*Production-Ready Spec*)  
**Target Infrastruktur:** Static Web App / PWA via GitHub + Cloudflare Pages (100% Gratis, Rp0 Backend)

---

## 1. Ringkasan Eksekutif & Prinsip Produk

**StickyPlan** adalah aplikasi web pencatat *itinerary* perjalanan berbasis metafora **sticky note per lembar tanggal** yang dirancang khusus untuk kenyamanan penggunaan satu tangan di smartphone (*mobile-first*). Seluruh data tersimpan secara lokal (*offline-first*) tanpa memerlukan akun atau server berbayar, dilengkapi fitur *bulk input* untuk mempercepat penyalinan rundown dari Word/Excel/WhatsApp serta integrasi *deep-link* cerdas ke Google Maps.

### 4 Pilar Prinsip Produk
1. **Speed to Information (< 5 Detik):** Saat dibuka di lapangan, pengguna langsung mendarat di lembar tanggal hari ini, melihat jam dan judul kegiatan dengan jelas, lalu membuka detail/peta dalam 1–2 ketukan.
2. **Mobile Ergonomics First:** Aksi utama berada di *thumb zone* (area jangkauan ibu jari di bawah layar), input menggunakan *Bottom Sheet*, dan kontrol geser urutan ramah layar sentuh.
3. **Offline-First & Zero Lock-In:** Dapat dibuka 100% dalam mode pesawat (PWA) dan seluruh data dapat dicadangkan/dipulihkan kapan saja melalui file JSON standar.
4. **High-Contrast Aesthetics:** Estetika kertas *sticky note* tidak boleh mengorbankan keterbacaan teks, efisiensi ruang layar HP, maupun standar kontras WCAG AA.

---

## 2. Target Pengguna & Konteks Pemakaian

| Segmen | Profil & Kebiasaan | Kebutuhan Utama |
| :--- | :--- | :--- |
| **Pelaku Perjalanan Dinas / Audit** | Mengikuti rundown padat lintas lokasi dalam 2–5 hari; menerima jadwal awal dalam bentuk tabel Word/PDF atau pesan WA. | Bisa menyalin tabel rundown sekaligus (*Bulk Input*), mudah menggeser urutan saat jadwal berubah mendadak di lapangan, dan cepat membuka rute Google Maps. |
| **Pelancong Mandiri / Grup Kecil** | Menyusun jadwal per hari (transportasi, hotel, kuliner, wisata) dan membukanya sambil berjalan atau di area minim sinyal. | Tampilan per lembar tanggal yang tidak membingungkan, bisa dipakai *offline* tanpa login, dan mudah dibagikan/di-*backup* via JSON. |

---

## 3. Spesifikasi Fungsional Lengkap (Feature Specs)

### F1. Manajemen Trip & Lembar Tanggal (*Sticky Sheet*)
* **Inline Edit Judul Trip:** Mengetuk judul trip di *Top Bar* mengubahnya menjadi *input field* langsung (maks. 60 karakter; simpan via tombol centang atau tombol `Enter`).
* **Inline Edit Ringkasan Hari:** Mengetuk sub-judul di bawah tanggal (*day summary*) memungkinkan penyuntingan catatan singkat hari tersebut (maks. 100 karakter).
* **Kustomisasi Warna Kertas per Hari:** Pengguna dapat memilih 1 dari 4 tema warna pastel berkontras tinggi pada tiap lembar tanggal:
  1. `warm-yellow` (Kuning Kertas — Default)
  2. `mint` (Mint Lembut)
  3. `cream` (Krem Hangat)
  4. `soft-blue` (Biru Muda)
* **Navigasi 3 Jalur:**
  1. **Date Pill Strip (Atas):** Bar horizontal *scrollable* berisi seluruh tanggal terdaftar untuk lompat langsung ke tanggal tujuan.
  2. **Swipe Gesture (Kartu):** Geser kiri (*Next*) dan geser kanan (*Prev*) pada kartu utama dengan ambang batas horizontal `|dx| > 60px` dan dominansi horizontal `|dx| > |dy| * 1.5` agar tidak bentrok dengan *vertical scroll*.
  3. **Bottom Navigation Bar (Bawah):** Tombol `Prev` dan `Next` yang otomatis nonaktif (*disabled*) pada lembar pertama/terakhir.
* **Tambah Lembar Tanggal (`+ Tanggal`):**
  * Secara default mengisi nilai awal **H+1** dari tanggal terakhir yang terdaftar.
  * Jika pengguna memasukkan tanggal yang sudah ada, sistem otomatis berpindah ke lembar tersebut tanpa membuat duplikat.
  * Seluruh lembar tanggal otomatis terurut secara kronologis (`YYYY-MM-DD`).
* **Smart Auto-Landing:** Saat aplikasi pertama kali dibuka, sistem mengecek tanggal lokal perangkat; jika cocok dengan salah satu lembar tanggal, langsung tampilkan lembar tersebut (jika tidak, tampilkan lembar pertama).

### F2. CRUD Kegiatan & Accordion Detail
* **Tampilan Ringkas (Default Row):** Setiap baris kegiatan menampilkan:
  * *Drag handle* di kiri (`GripVertical`).
  * Badge jam mulai (`HH:mm`, format 24 jam, *monospace tabular-nums*).
  * Judul kegiatan (maks. 80 karakter, *word-wrap* aman).
  * Ikon indikator pin lokasi hijau (hanya muncul jika `maps_url` valid tersedia).
  * Ikon panah *chevron* yang berotasi $180^\circ$ saat terbuka.
* **Accordion Tunggal:** Mengetuk baris kegiatan membuka panel detailnya dan otomatis menutup panel kegiatan lain agar layar HP tetap ringkas.
* **Konten Panel Detail:**
  * Deskripsi lengkap (mendukung teks multi-baris `whitespace-pre-line`, maks. 1.000 karakter).
  * Tombol penuh **"Buka di Google Maps"** (jika `maps_url` valid tersedia).
  * Baris kontrol: tombol geser atas/bawah, tombol **Edit**, dan tombol **Hapus**.
* **Smart Google Maps Parser:**
  * Jika pengguna menempel teks mentah hasil *Share* dari Google Maps (contoh: `"Radar Lampung https://maps.app.goo.gl/xyz"`), sistem otomatis mengekstrak URL `https://...` yang valid.
  * Jika pengguna hanya mengetik nama lokasi polos (contoh: `"Mbok Wito Lampung"`), sistem otomatis mengonversinya menjadi tautan pencarian Google Maps yang aman: `https://www.google.com/maps/search/?api=1&query=Mbok%20Wito%20Lampung`.

### F3. Pengubahan Urutan (*Drag-and-Drop* & *Touch Controls*) + Sortir Jam
* **Drag-and-Drop:** Setiap baris kegiatan dapat diseret (*drag*) untuk mengubah posisi urutan secara bebas saat rencana di lapangan bergeser.
  * *Catatan Implementasi Produksi:* Prototipe menggunakan HTML5 Drag-and-Drop API (optimal di desktop). Untuk versi produksi mobile (iOS Safari & Android Chrome), wajib ditingkatkan menggunakan library berbasis *Pointer/Touch Events* seperti **`@dnd-kit/core` + `@dnd-kit/sortable`** dengan aktivasi *long-press* atau khusus pada *drag handle* agar tidak mengganggu *scroll* layar.
* **Kontrol Geser Ramah Sentuhan (Fallback Wajib):** Di dalam *accordion* yang terbuka, tersedia tombol panah **Naik (`ArrowUp`)** dan **Turun (`ArrowDown`)** sebagai metode pengurutan 1-ketuk yang 100% akurat di layar HP kecil.
* **Tombol "Urutkan Jam":** Karena pengguna dapat menggeser urutan secara manual, sistem menyediakan tombol eksplisit **"Urutkan Jam"** di header kartu untuk mengembalikan urutan seluruh kegiatan berdasarkan kronologi `start_time` (`00:00`–`23:59`).
  * *Aturan Bisnis:* Menambah kegiatan baru (tunggal atau *bulk*) otomatis mengurutkan daftar berdasarkan jam; mengedit kegiatan mempertahankan posisinya sampai pengguna menggeser atau menekan "Urutkan Jam".

### F4. Bulk Input Multi-Format dengan Live Preview
Pada *Bottom Sheet* tambah kegiatan, pengguna dapat beralih ke tab **Bulk Input** untuk memasukkan banyak agenda sekaligus (1 baris = 1 kegiatan).

* **3 Format Parser yang Didukung:**
  1. **Format Pipa (`|`):** `09:00 | Judul Kegiatan | Deskripsi | Link Maps atau Nama Lokasi`
  2. **Format Tabel Word/Excel (Tab `\t`):** Pengguna dapat langsung blok dan *copy-paste* tabel rundown dari MS Word, Excel, atau Google Sheets (`Waktu \t Agenda \t Keterangan \t [Lokasi]`).
     * Otomatis melewati baris *header* tabel yang diawali kata `Waktu`, `Jam`, atau `Time`.
     * Jika kolom waktu berupa rentang (misal `10.30–12.00`), jam awal (`10:30`) masuk ke `start_time`, dan rentang waktunya otomatis disisipkan di awal deskripsi (`10.30–12.00 | ...`).
  3. **Format Cepat WhatsApp (Spasi):** `09:00 Check in hotel` atau `10.30-12.00 Penjemputan rombongan`.
* **Normalisasi Jam Otomatis:** Mengubah variasi `9.00`, `09.00`, atau `9:00` menjadi format standar `09:00`.
* **Live Preview:** Menampilkan jumlah kegiatan yang berhasil dideteksi beserta daftar pratinjau (jam, judul, ikon peta) secara *real-time* sebelum pengguna menekan tombol simpan.

### F5. Penyimpanan Offline, Backup/Restore JSON, & Proteksi Data
* **Auto-Save Lokal:** Setiap perubahan state langsung disimpan ke `localStorage` di bawah kunci terversioning (`stickyplan_data_v1`), dibungkus dalam *Storage Service Layer* agar mudah dimigrasi ke IndexedDB di masa depan.
* **Export JSON:** Mengunduh seluruh data perjalanan dalam format `stickyplan-YYYY-MM-DD.json`.
* **Import JSON dengan Sanitasi Ketat:** Membaca file `.json`, memvalidasi struktur dan tipe tiap field, memotong panjang string sesuai batas karakter, memvalidasi URL `https:`, serta menolak file rusak dengan pesan error jelas **tanpa menghapus data yang sedang aktif**.
* **Custom Confirmation Modal:** Seluruh aksi destruktif (Hapus Kegiatan, Hapus Lembar Tanggal beserta jumlah kegiatannya, dan Reset ke Data Demo) wajib melalui dialog konfirmasi kustom di dalam UI (dilarang menggunakan `window.confirm()` atau `window.alert()`).
* **PWA Offline Support:** Dilengkapi `manifest.webmanifest`, ikon aplikasi (192×192 & 512×512), dan *Service Worker* (strategi *Cache-First* untuk aset statis) sehingga dapat di-install ke *Home Screen* Android/iOS.

---

## 4. Standar UI/UX & Design System (Best Practices)

### A. Tata Letak & Responsivitas Mobile
* **Container:** `max-w-md mx-auto min-h-[100dvh]` agar di desktop tetap tampil proporsional seperti aplikasi HP, dan di smartphone memenuhi lebar layar penuh tanpa *horizontal overflow*.
* **Safe Area:** Area *Bottom Navigation Bar* dan *Bottom Sheet* wajib memperhatikan `padding-bottom: env(safe-area-inset-bottom)` agar tidak tertutup *home indicator* iPhone/Android modern.
* **Thumb Zone & Touch Target:** Seluruh elemen interaktif (tombol `Prev`, `+ Kegiatan`, `Next`, ikon pengaturan, tombol tutup *sheet*) wajib memiliki ukuran minimal **44×44 px** (sesuai Apple Human Interface Guidelines & Material Design 3).

### B. Sistem Visual & Tipografi
* **Font Utama:** Sans-serif sistem / Inter untuk keterbacaan tinggi di layar kecil.
* **Tipografi Jam:** Wajib menggunakan `font-mono tabular-nums` agar seluruh angka jam (`09:00`, `14:45`) sejajar vertikal dengan rapi.
* **Kontras Warna:** Teks utama menggunakan `stone-900` (`#1C1917`) di atas latar kertas pastel lembut (`#FEFCE8`, `#ECFDF5`, `#FAF5F0`, `#EFF6FF`) — menghasilkan rasio kontras > 12:1 (melampaui standar WCAG AAA).
* **Micro-Interactions:** Transisi animasi hanya menggunakan properti GPU-accelerated (`transform`, `opacity`, `background-color`) untuk menjaga performa 60 FPS.

### C. Pola Umpan Balik & Aksesibilitas (a11y)
* **Toast Notification:** Umpan balik non-blocking di bagian atas layar selama 2,8 detik (untuk sukses simpan, sortir, export/import, atau peringatan error).
* **Empty State:** Jika suatu tanggal belum memiliki kegiatan, tampilkan ilustrasi ikon kalender dan instruksi jelas mengarah ke tombol `+ Kegiatan` / *Bulk Input*.
* **Atribut Aksesibilitas:** Wajib menyertakan `aria-expanded` pada baris *accordion*, `aria-label` pada seluruh tombol berbasis ikon, `role="dialog" aria-modal="true"` pada *Bottom Sheet* dan modal konfirmasi, serta dukungan tombol `Escape` untuk menutup *overlay*.

---

## 5. Arsitektur Teknis & Best Practices Programming

### A. Rekomendasi Tech Stack (Produksi)
| Lapisan | Teknologi | Alasan Pemilihan |
| :--- | :--- | :--- |
| **Framework UI** | React 18+ & Vite | Ekosistem matang, *build* sangat cepat, hasil akhir statis murni (`dist/`). |
| **Styling** | Tailwind CSS v3/v4 | Konsistensi *design token*, CSS hasil kompilasi sangat kecil (*tree-shaken*). |
| **Ikon** | `lucide-react` | Ringan, berbasis SVG tajam, mendukung *tree-shaking* per ikon. |
| **Drag & Drop** | `@dnd-kit/core` + `@dnd-kit/sortable` | Mendukung *touch drag* halus di iOS/Android, aksesibilitas keyboard, dan tidak konflik dengan *scroll*. |
| **PWA** | `vite-plugin-pwa` (Workbox) | Otomatis menghasilkan *Service Worker* dan *precaching* aset saat *build*. |
| **Hosting & CI/CD** | GitHub + Cloudflare Pages | Gratis tanpa batas *bandwidth*, HTTPS otomatis, *auto-deploy* tiap `git push`. |

### B. Struktur Folder Proyek (Modular / Separation of Concerns)
Hindari menumpuk seluruh kode dalam satu file pada repositori produksi. Pisahkan berdasarkan tanggung jawab:

```text
stickyplan/
├── public/
│   ├── _headers                 # Security headers Cloudflare Pages
│   ├── favicon.svg
│   └── icons/                   # Ikon PWA 192x192 & 512x512
├── src/
│   ├── constants/
│   │   ├── themes.js            # Konfigurasi 4 warna kertas sticky note
│   │   └── seedData.js          # Data default / contoh awal
│   ├── services/
│   │   └── storageService.js    # Abstraksi baca/tulis localStorage & quota handling
│   ├── utils/
│   │   ├── dateUtils.js         # Format tanggal lokal Indonesia
│   │   ├── urlSecurity.js       # Validasi HTTPS & Smart Google Maps parser
│   │   ├── bulkParser.js        # Parser Pipe, Tab (Word/Excel), & Space (WA)
│   │   └── jsonValidator.js     # Sanitasi ketat untuk Import JSON
│   ├── hooks/
│   │   ├── useItineraryStore.js # Manajemen state utama & sinkronisasi storage
│   │   └── useSwipe.js          # Deteksi gestur swipe kiri/kanan anti-konflik
│   ├── components/
│   │   ├── HeaderBar.jsx        # Top bar + inline edit judul trip
│   │   ├── DatePillStrip.jsx    # Navigasi tanggal horizontal + tombol tambah
│   │   ├── StickyCard.jsx       # Kartu tanggal, switcher warna, & daftar sortable
│   │   ├── ItineraryItemRow.jsx # Baris kegiatan + accordion + kontrol urutan
│   │   ├── BottomNavBar.jsx     # Prev / + Kegiatan / Next (Thumb Zone)
│   │   ├── ItemFormSheet.jsx    # Bottom sheet Tab Single & Tab Bulk Input
│   │   ├── AddDateSheet.jsx     # Bottom sheet tambah lembar tanggal
│   │   ├── DataManagerSheet.jsx # Bottom sheet Export/Import/Hapus/Reset
│   │   ├── ConfirmModal.jsx     # Dialog konfirmasi kustom
│   │   └── Toast.jsx            # Notifikasi melayang
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js               # Konfigurasi Vite + vite-plugin-pwa
└── package.json
```

### C. Kontrak Skema Data (`schema_version: 1`)
Seluruh penyimpanan lokal maupun file Export/Import wajib mematuhi kontrak struktur berikut:

```json
{
  "schema_version": 1,
  "trip": {
    "id": "string (unique)",
    "title": "string (max 60 chars)",
    "created_at": "ISO-8601 string",
    "updated_at": "ISO-8601 string"
  },
  "day_sheets": [
    {
      "id": "string (unique)",
      "date": "YYYY-MM-DD",
      "note_color": "warm-yellow | mint | cream | soft-blue",
      "day_summary": "string (max 100 chars)",
      "items": [
        {
          "id": "string (unique)",
          "start_time": "HH:mm",
          "title": "string (max 80 chars)",
          "description": "string (max 1000 chars)",
          "maps_url": "https://... | null"
        }
      ]
    }
  ]
}
```
*Catatan Urutan:* Urutan indeks elemen di dalam array `items` merupakan sumber kebenaran (*source of truth*) untuk posisi tampilan hasil *drag-and-drop*.

---

## 6. Standar Keamanan & Integritas Data (Security Checklist)

Meskipun tidak memiliki backend, aplikasi *client-side* tetap wajib menerapkan standar keamanan modern:

1. **Perlindungan XSS (Cross-Site Scripting):**
   * Dilarang keras menggunakan `dangerouslySetInnerHTML` atau `innerHTML`. Seluruh data pengguna dirender lewat *auto-escaping* JSX.
2. **Validasi & Sanitasi URL Ketat:**
   * Setiap `maps_url` wajib lolos validasi `new URL(url)` dengan protokol tepat `https:`.
   * Tolak mentah-mentah protokol berbahaya (`javascript:`, `data:`, `vbscript:`).
3. **Hardening Tautan Eksternal:**
   * Semua link Google Maps wajib menggunakan atribut `target="_blank" rel="noopener noreferrer"` untuk mencegah *reverse tabnabbing*.
4. **Sanitasi Import JSON (Anti-Crash & Anti-Prototype Pollution):**
   * Saat mengimpor file `.json`, buat objek baru secara eksplisit hanya dari properti yang diizinkan (*allowlist*), jangan pernah langsung menyalin objek mentah hasil `JSON.parse()` ke state (mencegah injeksi kunci `__proto__` atau `constructor`).
5. **Security Headers Cloudflare Pages (`public/_headers`):**
   ```text
   /*
     X-Content-Type-Options: nosniff
     X-Frame-Options: DENY
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: camera=(), microphone=(), geolocation=()
     Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';
   ```

---

## 7. Panduan Deployment Gratis (GitHub + Cloudflare Pages)

1. **Inisialisasi Repositori GitHub:** Push kode proyek Vite/React ke repositori GitHub (publik atau privat).
2. **Koneksi Cloudflare Pages:**
   * Masuk ke Dashboard Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
   * Pilih repositori `stickyplan`.
3. **Konfigurasi Build:**
   * **Framework preset:** `Vite`
   * **Build command:** `npm run build`
   * **Build output directory:** `dist`
4. **Auto-Deploy:** Setiap `git push` ke branch `main` otomatis membangun ulang dan memperbarui domain `*.pages.dev` dalam ~30–60 detik dengan sertifikat SSL gratis.

---

## 8. Kriteria Penerimaan & QA Testing Checklist

Sebelum rilis ke penggunaan lapangan, seluruh skenario di bawah ini wajib berstatus **PASS**:

| No | Kategori | Skenario Pengujian | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| 1 | **Offline PWA** | Buka aplikasi, aktifkan *Airplane Mode*, *reload* halaman, tambah 1 kegiatan. | Halaman tetap termuat normal, data tersimpan dan tidak hilang saat *reload* ulang. |
| 2 | **Swipe vs Scroll** | *Scroll* daftar kegiatan ke bawah/atas secara cepat di layar HP. | Daftar ter-*scroll* mulus tanpa tidak sengaja berpindah ke tanggal sebelah. |
| 3 | **Drag & Touch Order** | Geser urutan kegiatan pakai *drag handle* atau tombol panah, lalu *reload* halaman. | Urutan kustom tersimpan permanen hingga tombol "Urutkan Jam" ditekan. |
| 4 | **Bulk Input Tabel** | *Copy* tabel jadwal 10 baris dari MS Word/Excel (termasuk header), tempel di *Bulk Input*. | Header diabaikan, 10 baris terbaca di pratinjau dengan jam ternormalisasi, rentang waktu masuk ke deskripsi. |
| 5 | **Smart Maps Parser** | Tempel `"Mbok Wito https://maps.app.goo.gl/abc"` dan coba juga ketik `"Bandara Radin Inten II"`. | Keduanya menghasilkan tombol "Buka di Google Maps" yang valid dan membuka aplikasi peta di HP. |
| 6 | **Security Test** | Coba masukkan `javascript:alert(1)` di kolom Maps atau impor file `.json` korup/bukan JSON. | Link berbahaya ditolak (`null`); file korup memunculkan toast error tanpa menghapus jadwal lama. |
| 7 | **Performance** | Audit Lighthouse Mobile di Chrome DevTools. | Skor Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, PWA Installable = Valid. |