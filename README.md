# StickyPlan — Web Itinerary Mobile-First (Offline PWA)

Aplikasi web statis **Progressive Web App (PWA)** untuk mencatat dan membaca jadwal perjalanan harian per lembar tanggal dengan satu tangan di layar HP — cepat, bersih, dan **100% siap berjalan tanpa sinyal internet (Offline-First)**.

## Fitur Utama (MVP v1.0)
- **1 Lembar = 1 Tanggal:** Navigasi 3 arah lewat *Date Pill Strip* di atas, tombol ibu jari `Prev / Next` di bawah, dan gestur *swipe* kiri/kanan 60 FPS yang langsung melompat antar tanggal terdaftar.
- **Auto-Landing Tanggal Lokal:** Otomatis mendarat di lembar tanggal hari ini berdasarkan jam kalender lokal perangkat (anti-meleset UTC pada jam penerbangan subuh).
- **CRUD & Pengurutan Jam Otomatis:** Input jam 24 jam (`HH:mm`), judul, catatan opsional, dan *smart parser* tautan Google Maps yang otomatis mengurutkan agenda secara kronologis.
- **Accordion Detail & Deep-Link Google Maps Aman:** Ketuk kegiatan untuk membuka catatan detail (kode booking/kursi) dan tombol `Buka di Google Maps` yang disanitasi ketat (`https:` resmi + `noopener noreferrer`).
- **Offline-First & Backup Aman:** Terdaftar sebagai PWA yang dapat di-install ke *Home Screen* HP, dilengkapi **Unduh/Impor Backup JSON** (*Merge* atau *Replace* dengan pelindung *prototype pollution*), **Salin Teks Format WhatsApp**, serta **Safe Mode** pemulihan otomatis bila penyimpanan lokal rusak.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev          # Server pengembangan lokal
npm run typecheck    # Pemeriksaan tipe TypeScript strict
npm test             # Unit & UI integration tests (Vitest)
npm run build        # Build produksi ke dist/ + Service Worker PWA
npm run test:e2e     # Pengujian E2E layar HP & Mode Pesawat (Playwright)
```

## Deploy Gratis ke Cloudflare Pages

1. Push repositori ini ke GitHub (`main`).
2. Hubungkan ke **Cloudflare Pages**:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. Atau deploy langsung dari terminal:
   ```bash
   npx wrangler pages deploy dist --project-name=stickyplan
   ```

## Dokumentasi Arsitektur & Keamanan
- [01-PRD.md](./docs/01-PRD.md) — Spesifikasi Produk
- [02-TRD.md](./docs/02-TRD.md) — Spesifikasi Teknis & Performa
- [03-APP-FLOW.md](./docs/03-APP-FLOW.md) — Peta Alur Pengguna & 6-State UI
- [04-DESIGN-BRIEF.md](./docs/04-DESIGN-BRIEF.md) — Identitas Visual & Aksesibilitas
- [05-BACKEND-SCHEMA.md](./docs/05-BACKEND-SCHEMA.md) — Skema Data Lokal & Blueprint SQL/RLS Cloud Sync
- [06-IMPLEMENTATION-PLAN.md](./docs/06-IMPLEMENTATION-PLAN.md) — Rencana Implementasi TDD
- [ENV-CONTRACTS.md](./ENV-CONTRACTS.md) — Kontrak Variabel Lingkungan
