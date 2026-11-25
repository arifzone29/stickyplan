# Environment Variable Contracts (`ENV-CONTRACTS.md`)

Dokumen ini menjadi satu-satunya sumber kebenaran (*Single Source of Truth*) untuk seluruh variabel lingkungan di repositori **StickyPlan**. Setiap penambahan variabel lingkungan baru pada kode **wajib** didaftarkan di sini dan di `.env.example` sebelum di-*commit*.

## 1. Aturan Keamanan Variabel Lingkungan
1. **Zero Hardcoded Secrets:** Dilarang keras menulis API key, token, URL database privat, atau data personal di kode sumber.
2. **Pemisahan `Public` vs `Server-Only`:**
   - Variabel berawalan `VITE_*` akan ter-bundle ke dalam file JavaScript statis di browser pengguna (**100% Publik**). Hanya boleh berisi konfigurasi non-rahasia.
   - Variabel tanpa awalan `VITE_*` bersifat **Server/CI-Only** dan dilarang keras diimpor ke kode frontend (`src/`).
3. **Proteksi Git:** File `.env`, `.env.local`, `.env.production`, dan `.dev.vars` dikunci di `.gitignore`.

---

## 2. Kontrak Variabel Aktif — MVP v1.0 (Client-Side Static PWA)

Pada MVP v1.0, aplikasi berjalan 100% *offline-first* di sisi klien tanpa API berbayar maupun database eksternal (biaya Rp0). Seluruh variabel bersifat opsional dengan *fallback* aman.

| Nama Variabel | Scope | Wajib? | Nilai Default | Tujuan Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_APP_NAME` | `Public (Client)` | Opsional | `"StickyPlan"` | Nama aplikasi pada header metadata & ekspor file backup |
| `VITE_APP_VERSION` | `Public (Client)` | Opsional | `"1.0.0"` | Versi rilis aplikasi yang dicatat pada metadata file Export JSON |
| `VITE_STORAGE_NAMESPACE` | `Public (Client)` | Opsional | `"stickyplan_v1"` | Prefix kunci penyimpanan `localStorage` agar terisolasi antar environment uji |

---

## 3. Kontrak Cadangan — Iterasi Cloud Sync v2.0+ (Belum Aktif di MVP)

Jika di masa depan fitur sinkronisasi cloud diaktifkan (misalnya menggunakan Supabase atau Cloudflare Workers + D1), pembagian hak akses berikut wajib dipatuhi tanpa kompromi:

| Nama Variabel | Scope | Boleh Masuk Bundle Klien? | Aturan Keamanan Ketat |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `Public (Client)` | Ya | Endpoint publik proyek Supabase; wajib dilindungi oleh RLS aktif di seluruh tabel |
| `VITE_SUPABASE_ANON_KEY` | `Public (Client)` | Ya | Kunci anonim publik; hanya boleh bekerja di bawah pembatasan ketat PostgreSQL RLS (`(SELECT auth.uid()) = user_id`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `Server-Only` | **DILARANG KERAS** | Mem-bypass seluruh RLS; hanya boleh hidup di environment rahasia server/CI migrasi |
| `DATABASE_URL` | `Server-Only` | **DILARANG KERAS** | Kredensial koneksi PostgreSQL langsung (wajib akun *least-privilege*, bukan `postgres` superuser) |
| `CLOUDFLARE_API_TOKEN` | `CI/Deploy-Only` | **DILARANG KERAS** | Token deploy CI/CD terbatas pada scope *Cloudflare Pages: Edit* |
