# Technical Requirements Document (TRD): StickyPlan v1.0

**Status:** Baseline Persiapan MVP v1.0  
**Referensi Utama:** [01-PRD.md](./01-PRD.md) | [ENV-CONTRACTS.md](../ENV-CONTRACTS.md)

---

## 1. Tech Stack & Tooling yang Dikunci

Seluruh komponen dipilih untuk memenuhi batas ketat **< 150 KB gzipped**, **FCP < 1 detik**, **100% Offline-First**, dan **Biaya Infrastruktur Rp0**.

| Layer | Pilihan Teknologi | Alasan Teknis & Keamanan |
| :--- | :--- | :--- |
| **Runtime & Build** | **Node.js >= 22 + Vite 6 (TypeScript Strict)** | Build statis murni ke `dist/`, *tree-shaking* agresif, `strict: true` & `noUncheckedIndexedAccess: true`. |
| **UI Framework** | **Preact 10 (`preact` + `preact/hooks`)** *(opsi kompatibel React 19 bila diminta)* | Runtime hanya ~4 KB gzipped, auto-escaping JSX mencegah XSS tanpa `innerHTML`. |
| **Styling** | **Tailwind CSS v4 (`@tailwindcss/vite`)** | Hanya men-generate class CSS yang benar-benar terpakai (~5–8 KB gzipped), mendukung design tokens CSS variables. |
| **Icons** | **Inline SVG Terkurasi / `lucide-preact` (tree-shaken)** | Tanpa icon font besar dan tanpa emoji sebagai ikon UI; ukuran per ikon terukur. |
| **PWA & Offline** | **`vite-plugin-pwa` (Workbox `generateSW`)** | Precache seluruh aset JS/CSS/HTML/manifest/ikon agar aplikasi berjalan 100% di Mode Pesawat setelah kunjungan pertama. |
| **Client Storage** | **Repository Pattern di atas `localStorage` (`schema_version: 1`)** | Cukup menampung ribuan item teks (~5 MB), terisolasi di balik interface `ItineraryRepository` sehingga siap dipindah ke `IndexedDB` atau Supabase/D1 tanpa menyentuh komponen UI. |
| **Validasi Skema** | **Pure TypeScript Strict DTO Validator (Zero-bloat)** | Allow-listing properti eksplisit, anti-*mass assignment*, dan proteksi *prototype pollution* tanpa menambah puluhan KB library eksternal. |
| **Testing** | **Vitest + `@testing-library/preact` + Playwright** | Unit test cepat untuk domain/validator/storage + E2E test emulasi layar HP (`390x844`) & mode offline. |
| **Hosting & CI/CD** | **GitHub + Cloudflare Pages (Free Tier)** | Bandwidth statis tak terbatas pada Free Tier, SSL otomatis, preview per-branch, dan dukungan native `public/_headers`. |

---

## 2. Anggaran Performa (Performance Budget) & Optimasi Frontend

1. **Ukuran Bundle Produksi Awal:**
   - Target Preact + CSS + App Logic: **15–25 KB gzipped** (batas keras PRD: **< 150 KB gzipped**).
2. **Kecepatan Muat & Font Offline:**
   - Target **First Contentful Paint (FCP) < 1.0 detik** di jaringan 4G menengah dan `< 0.2 detik` dari cache Service Worker.
   - **Zero External Font CDN:** Dilarang memuat font dari `fonts.googleapis.com` saat runtime karena memperlambat FCP di sinyal lemah dan gagal saat offline pertama. Gunakan *system UI sans stack* + *system monospace stack* dengan `font-variant-numeric: tabular-nums`.
3. **Lazy Loading & Code Splitting:**
   - Komponen yang berada di luar layar awal (*below the fold / modal sekunder*), khususnya **Bottom Sheet Kelola Data & Import/Export JSON**, dimuat secara *lazy* (`lazy()` / dynamic `import()`) agar jalur kritis pembacaan jadwal hari ini tetap seringan mungkin.
   - Setiap elemen `<img>` non-LCP (bila ada ilustrasi *empty state* atau panduan install) wajib menyertakan `loading="lazy"` dan dimensi eksplisit (`width`/`height`) untuk mencegah CLS.
4. **Animasi 60 FPS:**
   - Transisi *swipe* lembar tanggal, *accordion* detail, dan *bottom sheet* hanya boleh menganimasikan `transform` dan `opacity`.
   - Wajib mematuhi `@media (prefers-reduced-motion: reduce)` dengan mematikan animasi geser bagi pengguna sensitif gerak.

---

## 3. Arsitektur Keamanan, Endpoint, & Proteksi Biaya

### 3.1 Keamanan Sisi Klien & Header Produksi (`public/_headers`)
Setiap rilis ke Cloudflare Pages wajib menyertakan file `public/_headers` berikut:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 3.2 Manajemen Rahasia & Variabel Lingkungan
- Semua variabel lingkungan didokumentasikan di [ENV-CONTRACTS.md](../ENV-CONTRACTS.md) dan `.env.example`.
- File `.env*` dikunci di `.gitignore`. Tidak ada *API key* pihak ketiga pada MVP v1.0.

### 3.3 Proteksi Endpoint, Rate Limit, & Pengendalian Tagihan (Zero-Cost Guarantee)
- **MVP v1.0 (Static-Only):**
  - Tidak menggunakan Google Maps JavaScript/Places API (yang berisiko eksploitasi kuota tagihan kartu kredit); 100% menggunakan **external HTTPS deep-link** ke aplikasi Google Maps.
  - Di-host sebagai aset statis murni di **Cloudflare Pages Free Tier** (tanpa eksekusi *serverless function* berbayar), dilindungi mitigasi DDoS L3/L4/L7 otomatis dari jaringan Cloudflare.
- **Aturan Wajib Saat Menambah Backend / AI / Auth di v2.0+:**
  1. Wajib mengaktifkan **Rate Limiting** ketat per IP & per `user_id` pada endpoint login, reset password, dan mutasi/AI (via Cloudflare WAF Rate Limiting Rules / Workers Rate Limiting API).
  2. Wajib memasang **Billing Alert & Spend Limit** pada akun Cloudflare / Supabase / penyedia API sebelum fitur dipublikasikan ke produksi.

---

## 4. Perintah Eksekusi Standar

```bash
npm run dev          # Menjalankan server pengembangan lokal Vite
npm run typecheck    # Pemeriksaan tipe ketat TypeScript (tsc --noEmit)
npm run lint         # Pemeriksaan kualitas & keamanan kode statis
npm test             # Menjalankan seluruh unit & integration test (Vitest)
npm run test:e2e     # Menjalankan pengujian browser mobile & offline (Playwright)
npm run build        # Build produksi ke folder dist/ + generate Service Worker PWA
npm run preview      # Menjalankan preview produksi lokal untuk uji PWA & Lighthouse
```
