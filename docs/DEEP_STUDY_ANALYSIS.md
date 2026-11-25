# Deep Study & Architectural Analysis: StickyPlan (MVP v1.0)

Sumber utama: [01-PRD.md](./01-PRD.md)

---

## 1. Intisari Produk & Value Proposition

**StickyPlan** menyelesaikan friksi nyata di lapangan: membuka PDF/WhatsApp/Docs dengan satu tangan saat terburu-buru di bandara, stasiun, atau sela rapat.

- **Core Loop (< 5 detik):** Buka PWA dari Home Screen -> mendarat otomatis di lembar tanggal hari ini -> scan kolom jam `HH:mm` (`tabular-nums`) -> ketuk baris kegiatan untuk membuka *accordion* catatan & tombol **Buka di Google Maps** -> langsung navigasi di aplikasi Google Maps bawaan HP.
- **Prinsip Desain Utama:** *High-density legibility over skeuomorphic decoration.* Nuansa kertas *sticky note* hadir lewat permukaan hangat berkontras tinggi (WCAG AA >= 4.5:1), tipografi jam sejajar vertikal, dan interaksi *thumb-zone* (>= 44x44 px), bukan bayangan tebal atau font tulisan tangan yang sulit dibaca sambil berjalan.
- **Infrastruktur Rp0:** Static PWA murni di browser pengguna (`localStorage` / `IndexedDB` terbungkus *repository pattern*), di-host di **GitHub + Cloudflare Pages**.

---

## 2. Temuan Kritis & Edge Cases Teknis (Hasil Bedah Mendalam PRD)

Selain 3 *blind spot* dan 4 skenario *stress-test* yang sudah tertulis di PRD, berikut **7 celah teknis tersembunyi** yang wajib dikunci sejak awal implementasi:

### 2.1 Jebakan Zona Waktu pada Auto-Landing "Hari Ini" (`YYYY-MM-DD`)
- **Masalah:** Menggunakan `new Date().toISOString().slice(0, 10)` di Indonesia (`WIB / UTC+7`, `WITA / UTC+8`, `WIT / UTC+9`) akan mengembalikan **tanggal kemarin** antara pukul `00:00` hingga `06:59` pagi — padahal jam tersebut justru waktu krusial keberangkatan pesawat/kereta pagi. Begitu juga `new Date("2026-11-25")` di-parse sebagai UTC midnight oleh spesifikasi ECMAScript.
- **Solusi Terkunci:** Selalu gunakan helper tanggal kalender lokal (`getFullYear()`, `getMonth() + 1`, `getDate()`) untuk mendapatkan string `YYYY-MM-DD` hari ini, dan parse `YYYY-MM-DD` menggunakan konstruktor komponen lokal `new Date(year, monthIndex, day)`.

### 2.2 Logika Fallback "Tanggal Terdekat" Saat Hari Ini Tidak Ada di Trip
- **Masalah:** PRD Alur A langkah 2 menyebut: *"jika cocok dengan data trip, langsung tampilkan lembar tanggal tersebut (jika tidak, tampilkan lembar tanggal terdekat/pertama)"*.
- **Solusi Terkunci:** Urutkan `day_sheets` secara kronologis (`date ASC`):
  1. Jika ada `date === todayLocal`, buka lembar tersebut.
  2. Jika `todayLocal < firstSheet.date` (sebelum keberangkatan), buka lembar **pertama**.
  3. Jika berada di sela tanggal kosong (misal ada lembar `25 Nov` dan `27 Nov`, hari ini `26 Nov`), buka lembar **mendatang terdekat** (`27 Nov`).
  4. Jika `todayLocal > lastSheet.date` (perjalanan sudah lewat), buka lembar **pertama** (atau lembar terakhir yang dilihat dalam sesi tersebut).

### 2.3 Konflik Gestur Swipe Horizontal vs Scroll & Copy Teks
- **Masalah:** Di layar HP, pengguna sering menyalin nomor kursi / kode *booking* di dalam *accordion* deskripsi, atau menggeser *Date Pill Strip* di atas. Jika *listener* swipe terlalu sensitif, kartu akan berpindah hari secara tidak sengaja.
- **Solusi Terkunci:**
  - Pasang *directional lock*: swipe hanya valid jika `Math.abs(dx) >= 56` px **dan** `Math.abs(dx) > Math.abs(dy) * 1.8`.
  - Abaikan gestur yang dimulai dari dalam *Date Pill Strip*, *Bottom Sheet*, elemen `<input>`/`<textarea>`/`<a>`/`<button>`, atau saat pengguna sedang menyeleksi teks (`window.getSelection()?.toString()`).
  - Hormati `prefers-reduced-motion: reduce`.

### 2.4 Parser & Whitelist URL Google Maps untuk Domain Lokal Indonesia
- **Masalah:** PRD menyebut host `google.com`, `maps.google.com`, `goo.gl`, dan `maps.app.goo.gl`. Di perangkat Indonesia, tautan Google Maps dari browser sering berupa `https://www.google.com/maps/...` atau `https://www.google.co.id/maps/...`. Selain itu, fitur *Share* dari aplikasi Google Maps menyertakan nama tempat & alamat sebelum URL (`"Stasiun Gambir Jl. Medan Merdeka... https://maps.app.goo.gl/xyz"`).
- **Solusi Terkunci:**
  1. Ekstrak substring `https://[^\s]+` pertama dari input jika teks bercampur nama lokasi.
  2. Validasi dengan `new URL(raw)`: wajib `protocol === 'https:'`.
  3. Izinkan host:
     - `maps.app.goo.gl`
     - `maps.google.com`, `maps.google.co.id`
     - `google.com`, `www.google.com`, `google.co.id`, `www.google.co.id` (khusus path diawali `/maps`)
     - `goo.gl` (khusus path diawali `/maps`)
  4. Jika pengguna hanya mengetik nama lokasi tanpa URL (misal `"Bandara Juanda Terminal 1"`), sediakan konversi eksplisit/otomatis ke pencarian aman: `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(q)>`.
  5. Tolak keras `javascript:`, `data:`, `vbscript:`, `http:`, atau domain pihak ketiga sembarang.

### 2.5 Eviksi Storage iOS Safari & Persistensi Offline PWA
- **Masalah:** Safari di iOS dapat menghapus penyimpanan website yang tidak dibuka selama 7 hari di tab biasa kecuali di-install ke *Home Screen* atau meminta persistent storage.
- **Solusi Terkunci:**
  - Panggil `navigator.storage?.persist?.()` saat inisialisasi/penyimpanan pertama.
  - Sediakan panduan/tombol *Install ke Home Screen* yang ringkas (mendukung event `beforeinstallprompt` di Android/Chrome dan petunjuk singkat *Share -> Add to Home Screen* di iOS).
  - Tampilkan status **"Terakhir di-backup: [waktu / Belum pernah]"** di *Bottom Sheet Kelola Data* dan *badge* pengingat halus jika ada perubahan yang belum pernah diekspor.

### 2.6 Virtual Keyboard HP Menutupi Bottom Sheet Form
- **Masalah:** Saat mengetik deskripsi atau menempel link Maps di HP, *on-screen keyboard* mengurangi tinggi layar aktif hingga separuh dan bisa menutupi tombol `Simpan`.
- **Solusi Terkunci:** Gunakan tinggi dinamis `max-h-[88dvh]` dengan area *body* internal `overflow-y-auto` dan *sticky footer* untuk tombol `Simpan`, sehingga tombol aksi tetap terlihat di atas keyboard.

### 2.7 Irisan Fitur "Backup Teks" (MVP Wajib vs Iterasi v1.1)
- **Temuan di PRD:** Bagian 0 (*Blind Spot #1*) dan Bagian 5 (*Mitigasi #2*) mewajibkan **Backup teks / Salin Teks Jadwal** di MVP, sementara Bagian 3 menaruh *Copy as Text (Format WhatsApp)* di daftar v1.1.
- **Rekomendasi:** Masukkan **1-klik Salin Teks Jadwal (format rapi siap tempel ke WhatsApp/Notes)** langsung di MVP bersamaan dengan Export/Import JSON. Implementasinya sangat ringan (< 30 baris fungsi murni) dan langsung menutup *blind spot* kehilangan data tanpa celah.

---

## 3. Peta Kapabilitas (Capability Map)

Seluruh MVP terbagi menjadi 5 modul bersih dengan arah dependensi satu arah (tanpa *circular dependency*):

| Module ID | Tanggung Jawab | Bergantung Pada |
| :--- | :--- | :--- |
| `domain-core` | Tipe data (`Trip`, `DaySheet`, `ItineraryItem`), kalkulasi tanggal lokal, pengurutan jam (`start_time` + `sort_order`), parser & sanitizer URL Maps, validator skema JSON, formatter teks backup | — |
| `storage-repo` | Abstraksi *Repository* (`StorageAdapter`), baca/tulis `localStorage` terversioning (`schema_version: 1`), migrasi, penanganan `QuotaExceededError`, *Safe Mode Reset*, Export/Import (Replace & Merge) | `domain-core` |
| `sticky-shell-ui` | Layout utama SPA mobile-first: *Top Bar* (edit judul trip), *Date Pill Strip* + `+ Tanggal`, *Sticky Note Card* dengan gestur swipe 60fps, *Bottom Thumb Bar* (`Prev`, `+ Kegiatan`, `Next`) | `domain-core`, `storage-repo` |
| `activity-crud-ui` | Baris kegiatan + *Accordion* detail & tombol deep-link Google Maps, *Bottom Sheet* Tambah/Edit/Hapus kegiatan (konfirmasi 2 langkah), *Bottom Sheet* Kelola Data & Tanggal | `sticky-shell-ui` |
| `pwa-deploy` | Konfigurasi `vite-plugin-pwa` (Service Worker offline precache, Web App Manifest, ikon), `public/_headers` (CSP ketat Cloudflare Pages), skrip deploy GitHub + Cloudflare Pages | `activity-crud-ui` |

**Urutan Build (Vertical & Bottom-Up):** `domain-core` -> `storage-repo` -> `sticky-shell-ui` -> `activity-crud-ui` -> `pwa-deploy`.

---

## 4. Perbandingan Opsi Tech Stack (Dalam Batas NFR < 150 KB Gzipped)

| Kriteria | Opsi A: Preact + TS + Vite + Tailwind v4 (Rekomendasi) | Opsi B: React 19 + TS + Vite + Tailwind v4 | Opsi C: Vanilla TS + Vite + CSS |
| :--- | :--- | :--- | :--- |
| **Estimasi Bundle (Gzipped)** | **~14–20 KB** (sangat ringan, FCP instan) | **~55–68 KB** (masih jauh di bawah batas 150 KB) | **~6–10 KB** (paling kecil) |
| **Keamanan Anti-XSS** | Otomatis via JSX escaping (tanpa `innerHTML`) | Otomatis via JSX escaping (tanpa `innerHTML`) | Manual (`textContent` / `createElement` disiplin tinggi) |
| **Produktivitas & State UI** | Deklaratif, *hooks* ringan, mudah kelola *accordion* & *bottom sheet* | Ekosistem paling umum & familier | Boilerplate DOM manual rawan bug saat fitur bertambah di v1.1 |
| **Testing (Vitest + Testing Library / Playwright)** | Cepat & deterministik | Cepat & deterministik | Butuh setup DOM fixture manual |

---

## 5. Kesiapan Ekosistem Gemini / Antigravity untuk Proyek Ini

| Kebutuhan Proyek | Skill / MCP / CLI | Status |
| :--- | :--- | :--- |
| **Arsitektur, TDD & Eksekusi Plan** | `superpowers`, `spec-driven-development`, `clean-code-and-edge-cases`, `ponytail` | Siap (Aktif) |
| **UI/UX Mobile-First & Anti-Slop** | `ui-ux-pro-max`, `impeccable`, `charles-unslop`, `taste-skill` + Workspace `stickyplan-mobile-ux` | Siap (Aktif) |
| **PWA Offline & Validasi Storage** | `context7` MCP + Workspace `stickyplan-pwa-offline` | Siap (Aktif) |
| **Keamanan Client-Side & CSP** | `security-and-hardening`, `cloudflare-security-audit`, `prelaunch-security-checklist` | Siap (Aktif) |
| **Uji Browser Mobile, Offline & Lighthouse** | `playwright` MCP, `chrome-devtools` MCP (`emulate`, `lighthouse_audit`), `artemis` MCP | Siap (Aktif) |
| **Git & GitHub Repository** | `git` + `gh` CLI terpasang lokal (perlu `gh auth login` saat akan push repo) | Terpasang (Perlu Login) |
| **Cloudflare Pages Deployment** | Workspace `stickyplan-cloudflare-deploy` + Plugin Marketplace **Cloudflare** (opsional 1-klik) / `npx wrangler` | Siap Dipasang |
