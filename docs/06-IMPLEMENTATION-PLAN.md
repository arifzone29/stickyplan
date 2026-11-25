# StickyPlan MVP v1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` and `superpowers:verification-before-completion` to implement this plan task-by-task in thin vertical slices. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi web PWA *offline-first* **StickyPlan** untuk menyusun dan membaca jadwal perjalanan per lembar tanggal dengan satu tangan di layar HP serta siap di-deploy gratis ke GitHub + Cloudflare Pages.

**Architecture:** Single-Page Application (SPA) statis berbasis Preact + TypeScript + Vite + Tailwind CSS v4 dengan pemisahan tegas antara *Pure Domain Core* (kalkulasi tanggal lokal, pengurutan jam, sanitasi URL Maps, validasi skema anti-*prototype pollution*), *Storage Repository* (`localStorage` terversioning dengan *Safe Mode*), dan komponen UI *mobile-first* dengan *lazy-loaded* sheet manajemen data.

**Tech Stack:** Preact 10, TypeScript 5 (Strict), Vite 6, Tailwind CSS v4, `vite-plugin-pwa` (Workbox), Vitest + `@testing-library/preact`, Playwright.

**Spec:** [01-PRD.md](./01-PRD.md), [02-TRD.md](./02-TRD.md), [03-APP-FLOW.md](./03-APP-FLOW.md), [04-DESIGN-BRIEF.md](./04-DESIGN-BRIEF.md), [05-BACKEND-SCHEMA.md](./05-BACKEND-SCHEMA.md).

---

## Global Constraints

- Ukuran total bundle awal produksi wajib `< 150 KB` gzipped (target `< 25 KB` gzipped) dan FCP `< 1 detik`.
- Zero `innerHTML` / `dangerouslySetInnerHTML`; semua teks dirender sebagai teks murni yang ter-escape otomatis.
- Tanggal kalender lokal (`YYYY-MM-DD`) wajib dihitung dengan `getFullYear()`, `getMonth()`, `getDate()` — dilarang memakai `toISOString().slice(0, 10)` atau `new Date("YYYY-MM-DD")`.
- URL Google Maps wajib melalui `new URL()`, protokol `https:`, dan *host allowlist* resmi Google Maps (`maps.app.goo.gl`, `maps.google.com`, `maps.google.co.id`, atau `google.com`/`www.google.com`/`google.co.id`/`www.google.co.id`/`goo.gl` dengan path `/maps`), dirender dengan `target="_blank" rel="noopener noreferrer"`.
- Semua target sentuh interaktif minimal `44x44 px` dengan jarak antar tombol `>= 8px`; input form menggunakan `font-size >= 16px` agar iOS Safari tidak *auto-zoom*.
- Seluruh input form dan file Import JSON wajib melalui *strict DTO allow-list validator* (tolak `__proto__`, `constructor`, `prototype`, serta tolak file `> 2 MB`).

## Review Focus (5 Edge Cases Kritis yang Wajib Diuji dengan Unit/E2E Test)

1. **Penerbangan Subuh WIB (`00:30` UTC+7):** Saat jam lokal `2026-11-25 00:30 WIB` (`2026-11-24T17:30:00Z`), auto-landing wajib membuka lembar `2026-11-25`, bukan `2026-11-24`.
2. **Teks Tempelan "Share" Google Maps Bercampur Alamat:** Input `"Hotel Majapahit Jl. Tunjungan No.65 https://maps.app.goo.gl/XyZ123"` otomatis mengekstrak `https://maps.app.goo.gl/XyZ123`, sedangkan `"javascript:alert(1)"` atau `"https://evil.com/maps"` ditolak tegas.
3. **Dua Kegiatan di Jam Sama (`12:00`):** Item kedua pada `12:00` mendapat `sort_order` lebih besar sehingga urutan tetap stabil dan deterministik setiap kali halaman dimuat ulang.
4. **File Import JSON Beracun / Korup:** Mengimpor JSON berisi `{"__proto__":{"polluted":true}}` atau referensi `day_sheet_id` yatim wajib ditolak tanpa merusak jadwal lama pengguna yang sudah tersimpan.
5. **Navigasi Tanggal Lompat (`25 Nov` -> `27 Nov`) & Konfirmasi Hapus:** Tombol `Next` pada `25 Nov` langsung membuka `27 Nov` (tanpa membuat lembar kosong `26 Nov`), dan menghapus `25 Nov` menampilkan jumlah kegiatan yang ikut terhapus dalam konfirmasi 2 langkah.

---

## Struktur Direktori & File Target

```text
src/
  domain/
    types.ts              # Kontrak tipe entitas, DTO, NoteColor, & hasil validasi
    dateUtils.ts          # Kalender lokal YYYY-MM-DD, format tanggal ID, & algoritma auto-landing
    mapsUrl.ts            # Parser teks Share Google Maps, konversi pencarian aman, & whitelist URL
    sorting.ts            # Pengurutan deterministik start_time + sort_order
    validators.ts         # Strict DTO allow-list validator + anti-prototype-pollution JSON validator
    textFormatter.ts      # Formatter teks backup rapi siap salin ke WhatsApp / Notes
  storage/
    repository.ts         # Abstraksi ItineraryRepository, baca/tulis localStorage, Safe Mode, Merge/Replace import
  components/
    TopBar.tsx            # Judul trip editable inline + indikator offline + tombol buka Kelola Data
    DatePillStrip.tsx     # Deretan pill tanggal horizontal scrollable + form ringan + Tanggal
    StickySheetCard.tsx   # Kartu kertas hangat, header tanggal, daftar kegiatan, empty state, & swipe 60fps
    ActivityRow.tsx       # Baris jam tabular-nums + judul + accordion detail + deep-link Google Maps
    BottomThumbBar.tsx    # Navigasi ibu jari Prev | + Kegiatan | Next (>= 48px tinggi sentuh)
    ActivityFormSheet.tsx # Bottom sheet tambah/edit kegiatan + 2-step delete + live preview Maps
    DataManageSheet.tsx   # (Lazy-loaded) Export JSON, Import JSON (Replace/Merge), Salin Teks WA, Hapus Tanggal
    SafeModeScreen.tsx    # Layar penyelamatan saat storage lokal terdeteksi korup
    Icons.tsx             # Kumpulan SVG line icons ringan & konsisten (tanpa emoji)
  hooks/
    useSwipeNavigation.ts # Hook directional-locked horizontal swipe + reduced-motion guard
    useOnlineStatus.ts    # Deteksi status koneksi untuk indikator tenang "Offline siap"
  app.tsx                 # State orkestrasi utama aplikasi
  main.tsx                # Entry point + registrasi Service Worker PWA + storage.persist()
  index.css               # Tailwind v4 + custom design tokens CSS variables
public/
  _headers                # Content-Security-Policy & security headers Cloudflare Pages
  icons/                  # Ikon PWA 192x192, 512x512, maskable, & favicon.svg
tests/
  domain/                 # Unit tests murni (dateUtils, mapsUrl, sorting, validators, textFormatter)
  storage/                # Integration tests repository, Safe Mode quarantine, QuotaExceeded, Import Merge/Replace
  ui/                     # Component & user-flow tests (@testing-library/preact)
e2e/
  stickyplan.spec.ts      # Playwright mobile viewport (390x844) + Airplane offline mode verification
```

---

## Fase Eksekusi Bertahap (Vertical TDD Slices)

### Fase 1: Scaffolding Minimal & Pure Domain Core (TDD)
- [x] Inisialisasi `package.json`, `tsconfig.json` (strict), `vite.config.ts` (Preact + Tailwind v4 + `vite-plugin-pwa`), `vitest.config.ts`, dan `public/_headers`.
- [x] Tulis *failing unit tests* untuk `dateUtils.ts` (termasuk kasus `00:30 WIB` & auto-landing tanggal terdekat), lalu implementasikan hingga hijau.
- [x] Tulis *failing unit tests* untuk `mapsUrl.ts` (ekstraksi teks Share, domain `google.co.id/maps`, konversi query nama tempat, penolakan `javascript:` & host asing), lalu implementasikan hingga hijau.
- [x] Tulis *failing unit tests* untuk `sorting.ts`, `validators.ts` (termasuk blokir `__proto__` & batas panjang karakter), dan `textFormatter.ts`, lalu implementasikan hingga seluruh tes hijau.

### Fase 2: Hardened Storage Repository, Safe Mode, & Import/Export (TDD)
- [x] Tulis *failing tests* untuk `storage/repository.ts` mencakup: seed awal pengguna baru, CRUD trip/tanggal/kegiatan, penanganan `QuotaExceededError`, karantina JSON korup ke *Safe Mode*, serta Import JSON mode *Replace* & *Merge*.
- [x] Implementasikan `LocalStorageItineraryRepository` dengan *strict DTO allow-listing* hingga seluruh tes repositori hijau.

### Fase 3: Sticky Sheet Shell, Auto-Landing, & Navigasi 3 Arah
- [x] Bangun token visual di `src/index.css` sesuai [04-DESIGN-BRIEF.md](./04-DESIGN-BRIEF.md) (rasio kontras WCAG AA, `tabular-nums`, *safe-area-inset*).
- [x] Implementasikan `TopBar` (edit nama trip), `DatePillStrip` (+ tambah tanggal baru), `StickySheetCard`, `BottomThumbBar` (`Prev`/`Next` lembar terdaftar), dan `useSwipeNavigation` (directional lock).
- [x] Tulis tes interaksi komponen untuk memastikan perpindahan tanggal (`25 Nov` -> `27 Nov` langsung) dan *empty state* berjalan mulus.

### Fase 4: Accordion Kegiatan & Keyboard-Safe CRUD Bottom Sheet
- [x] Implementasikan `ActivityRow` (tampilan ringkas jam + judul + indikator peta, buka/tutup *accordion* detail, tombol `Buka di Google Maps` aman).
- [x] Implementasikan `ActivityFormSheet` (`<input type="time">`, validasi real-time, pratinjau parser lokasi Maps, penyisipan otomatis sesuai jam, serta konfirmasi 2 langkah untuk `Hapus Kegiatan`).
- [x] Tulis tes alur tambah, edit, urut otomatis jam yang sama, dan konfirmasi hapus kegiatan.

### Fase 5: Lazy-Loaded Data Management Sheet & Safe Mode Recovery
- [x] Implementasikan `DataManageSheet` secara *lazy-loaded* (`Export JSON`, indikator `Terakhir di-backup`, `Salin Teks Jadwal` format WA, `Import JSON` dengan pilihan *Replace* vs *Merge*, dan `Hapus Lembar Tanggal` dengan penghitung item terdampak).
- [x] Implementasikan `SafeModeScreen` untuk pemulihan data korup tanpa layar putih (*blank screen*).
- [x] Tulis tes alur ekspor/impor dan konfirmasi hapus tanggal.

### Fase 6: Konfigurasi Offline PWA, Audit Keamanan 20-Titik, & Verifikasi E2E
- [x] Lengkapi aset ikon PWA, `manifest.webmanifest`, dan registrasi *Service Worker* (`vite-plugin-pwa`) + `navigator.storage?.persist?.()`.
- [x] Jalankan `npm run typecheck`, `npm test`, dan `npm run build`; verifikasi ukuran bundle produksi `< 150 KB` gzipped serta keberadaan `dist/_headers` dan `dist/sw.js`.
- [x] Jalankan pengujian E2E Playwright pada ukuran layar HP (`390x844`), simulasi **Offline / Mode Pesawat**, dan audit aksesibilitas/performa sebelum commit rilis & deploy ke GitHub + Cloudflare Pages.
