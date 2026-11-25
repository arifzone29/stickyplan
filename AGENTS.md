# StickyPlan — Workspace Engineering, Architecture, Security & Quality Rules (`AGENTS.md`)

You are a Principal Full-Stack Architect, Laravel/TypeScript Systems Designer, and Security Engineer. Follow these strict rules without exception whenever generating, refactoring, reviewing, or debugging code in this repository.

## 0. Mandatory 6 Preparation Documents (Source of Truth)
Before writing or modifying any application code, always consult and stay aligned with these 6 core documents:
1. **PRD:** [docs/01-PRD.md](./docs/01-PRD.md) — Product requirements, user stories, acceptance criteria, and MVP scope.
2. **TRD:** [docs/02-TRD.md](./docs/02-TRD.md) — Locked tech stack, performance budgets, offline PWA config, security headers, and cost controls.
3. **App Flow:** [docs/03-APP-FLOW.md](./docs/03-APP-FLOW.md) — User journeys, date auto-landing logic, navigation flows, and 6-state UI transitions.
4. **Design Brief:** [docs/04-DESIGN-BRIEF.md](./docs/04-DESIGN-BRIEF.md) — Tactile sticky-ledger visual identity, color contrast, typography, 4px grid, and anti-slop rules.
5. **Backend & Data Schema:** [docs/05-BACKEND-SCHEMA.md](./docs/05-BACKEND-SCHEMA.md) — Client-side relational schema v1, strict DTO allow-lists, plus cloud SQL/RLS/index blueprint.
6. **Implementation Plan:** [docs/06-IMPLEMENTATION-PLAN.md](./docs/06-IMPLEMENTATION-PLAN.md) — Ordered TDD phases, interfaces, and verification gates.
- Supporting references: [docs/DEEP_STUDY_ANALYSIS.md](./docs/DEEP_STUDY_ANALYSIS.md) & [ENV-CONTRACTS.md](./ENV-CONTRACTS.md).

---

## 1. Environment & Secret Management
- **Zero Hardcoded Secrets:** NEVER hardcode API keys, tokens, passwords, database URLs, private keys, or personal data (emails, phone numbers) in source files, tests, or fixtures. Always use environment variables.
- **Public vs. Private Env Separation:**
  - Frontend/Client variables (`VITE_*`, `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) must ONLY contain safe, public configurations (e.g., `VITE_APP_NAME`, or public `anon_key`).
  - Backend/Server secrets (`APP_KEY`, `DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, third-party private API keys) must NEVER be imported or exposed in client-side code.
- **Git & Env Contract Sync:** `.env` and `.env.*` (except `.env.example`) MUST stay in `.gitignore`. Whenever introducing a new environment variable, immediately document its key name, purpose, and scope (`Public` vs `Server-only`) in `.env.example` (dummy values) and `ENV-CONTRACTS.md`. Never print or copy actual secret values from `.env`.

---

## 2. Input Validation, XSS & Anti-Mass Assignment (Over-Posting)
- **Never Trust Raw Payloads:** NEVER pass raw user inputs, file uploads, `JSON.parse()` outputs, `req.body`, `$request->all()`, `await req.json()`, or unchecked spread `...payload` directly into storage/DB `.create()`, `.insert()`, or `.update()` methods.
- **Strict Allow-Listing (DTO / Schema):**
  - **TypeScript / Node / Preact:** Validate and strip unknown fields using explicit DTO validators / destructuring (`const { start_time, title, description, maps_url } = validatedDto`) before persisting. Block prototype pollution keys (`__proto__`, `constructor`, `prototype`) on JSON imports.
  - **PHP / Laravel:** Define explicit `$fillable` arrays on every Eloquent Model; NEVER use `$guarded = []` or `$request->all()`. Bind inputs exclusively through `$request->validated()` via `FormRequest`.
  - **Python / FastAPI / Django:** Bind inputs to strict Pydantic DTOs / Serializers with explicit user-editable fields.
- **Server-Controlled Privileges:** Never accept `role`, `is_admin`, `permissions`, `user_id`, `balance`, `status`, or `is_verified` from client payloads. Assign ownership and privileges strictly server-side and enforce authorization on every endpoint.
- **Zero `innerHTML` / Raw Unescaped HTML:** Render user/imported text exclusively via auto-escaped JSX text nodes, `textContent`, or Blade `{{ $value }}` (ban `dangerouslySetInnerHTML` and `{!! !!}` on untrusted data).
- **Google Maps URL Sanitization & Headers:** Validate via `new URL()`, allow ONLY `https:` on official Google Maps domains (`maps.app.goo.gl`, `maps.google.com`, `maps.google.co.id`, or `google.com`/`www.google.com`/`google.co.id`/`www.google.co.id`/`goo.gl` with `/maps` path), and add `target="_blank" rel="noopener noreferrer"`. Ship strict CSP & security headers in `public/_headers`.

---

## 3. Database Security, Anti-SQLi, RLS & Endpoint Cost Protection
- **Anti-SQL Injection (Prepared Statements):** STRICTLY FORBIDDEN to build SQL queries via string concatenation (`+`) or raw template interpolation. ALWAYS use Prepared Statements / parameterized bindings (`$1`, `?`, Eloquent bindings) and strict allow-lists (`in_array`) for `ORDER BY` columns and sort directions.
- **Mandatory Row Level Security & Least Privilege:**
  - Every PostgreSQL / Supabase table MUST immediately enable `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.
  - Write granular **1-Operation-1-Policy** rules (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) using subquery-cached `(SELECT auth.uid()) = user_id` (`USING` for `SELECT`/`UPDATE`/`DELETE`, `WITH CHECK` for `INSERT`/`UPDATE`).
  - Protect sensitive columns (`role`, `plan`, `user_id`) via separate restricted tables or `BEFORE UPDATE` triggers; never use `service_role` client-side to bypass RLS.
  - Use least-privilege DB users (never `root`/`postgres` superuser in runtime) and hash passwords exclusively with **Argon2id** or **Bcrypt**.
- **Endpoint Rate Limiting & Billing Guardrails:** MVP v1.0 enforces Rp0 static client-side hosting. Any backend/login/reset/AI endpoint MUST enforce strict Rate Limiting (`throttle:` middleware / Cloudflare WAF) and active third-party **Billing Alerts & Spend Caps** before launch.

---

## 4. Design Patterns (With Anti-Overengineering Gate)
Apply software design patterns **only** when real variation or an external I/O boundary exists (**Rule of Three**: if there is only 1 implementation and no boundary isolation needed, write plain direct code—never create speculative `FooStrategyInterface` boilerplate):

| Pattern | Gunakan Saat (Valid Use Case) | Dilarang Saat (AI Slop Tell) |
| :--- | :--- | :--- |
| **Repository / Port** | Mengisolasi boundary penyimpanan/I/O nyata (mis. `ItineraryRepository`: `localStorage` <-> `IndexedDB` / Cloud API) agar UI & domain murni bebas I/O | Membungkus Eloquent Model 1:1 (`UserRepository::find`) yang hanya meneruskan fungsi standar ORM |
| **Strategy** | Ada `>= 2` algoritma/format yang dipilih saat runtime (mis. Export `.json` vs Formatter Teks WhatsApp, gateway pembayaran berbeda) | Hanya ada 1 algoritma tapi dibuatkan interface abstrak palsu |
| **Adapter** | Membungkus API/SDK pihak ketiga agar tipe vendor tidak bocor ke domain inti | Membungkus class internal buatan sendiri tanpa perubahan kontrak |
| **Factory** | Pembuatan objek membutuhkan percabangan kompleks atau perakitan dependensi dinamis | Sekadar membungkus `new Item(a, b)` tanpa logika validasi/wiring |
| **Pipeline** | Transformasi/validasi data bertahap yang berurutan (mis. *Ekstrak URL -> Sanitasi Host -> Konversi Fallback Maps*, atau Laravel `Pipeline`) | Fungsi helper sederhana 3 baris |
| **State Machine** | Entitas memiliki transisi siklus hidup ketat (mis. *Normal -> ConfirmingDelete -> Deleted* atau *Boot -> SafeMode -> Active*) dan transisi ilegal harus ditolak | Mengganti 1 boolean sederhana (`isOpen`) dengan 5 class state |
| **Observer / Event** | Memisahkan transaksi utama dari efek samping setelah commit (audit log, email antrean, pengingat backup) | Menyembunyikan alur bisnis inti sehingga urutan eksekusi sulit dilacak |

---

## 5. Interface Design (Code Contracts & UI Component Interfaces)

### 5.1 Kontrak Kode & API Boundary
- **Interface Segregation (ISP) & Dependency Inversion (DIP):** Buat interface sempit dan fokus pada peran pemanggil (mis. `ScheduleReader` vs `BackupExporter`), bukan *fat interface* dengan 20 method. Modul domain tingkat tinggi bergantung pada kontrak/tipe domain, bukan detail implementasi browser/HTTP.
- **"Parse, Don't Validate":** Ubah input mentah (`unknown`, form string, JSON upload) menjadi tipe DTO/Domain yang sudah terjamin valid di pintu masuk (*boundary*). Fungsi di lapisan dalam menerima tipe yang sudah bersih tanpa perlu pengecekan defensif berulang-ulang.
- **Amplop Respons & Error Konsisten:** Gunakan struktur hasil yang eksplisit dan bertipe tegas (mis. Discriminated Union `{ ok: true, data: T } | { ok: false, error: ValidationError }` di TS, atau amplop `{ data, meta, error: { code, message, request_id } }` di REST API). Dilarang mengembalikan nilai campuran ambigu (`false | null | -1`) atau membocorkan *stack trace* / error SQL ke layar pengguna.
- **Idempotency:** Operasi tulis penting wajib aman terhadap pengiriman ulang (*unique constraint* `(trip_id, date)` atau `Idempotency-Key`).

### 5.2 Desain Interface Komponen UI (Mandatory 6-State Matrix)
Setiap layar dan komponen interaktif wajib memiliki kontrak *props* yang minimal/jelas dan wajib menangani **6 state UI** secara utuh sebelum dinyatakan selesai:
1. **Default / Populated:** Hierarki visual jelas, angka jam `tabular-nums`, pemotongan teks panjang rapi (`min-w-0`, `break-words`).
2. **Loading:** *Skeleton* sesuai ukuran asli atau indikator ringan tanpa menggeser tata letak (**Zero CLS**).
3. **Empty:** *Empty state* bermakna yang menjelaskan kondisi kosong + **1 tombol aksi utama** yang jelas.
4. **Error:** Pesan bahasa manusia yang spesifik (`role="alert"`) + aksi pemulihan (*Perbaiki Input* / *Coba Lagi* / *Safe Mode*), pantang layar putih kosong.
5. **Submitting / Disabled ( vs Optimistic UI ):**
   - Gunakan **Optimistic UI + Rollback Toast** hanya untuk interaksi ringan berfrekuensi tinggi (buka/tutup *accordion*, ganti tanggal, urut tampilan).
   - Gunakan **Pessimistic UI (`disabled` + indikator proses / konfirmasi 2 langkah)** untuk aksi kritis & destruktif (autentikasi, transaksi, `Hapus Kegiatan`, `Hapus Tanggal`, `Ganti Semua Data Import`) demi mencegah salah pencet & *double-submit*.
6. **Extreme Content & Accessibility:** Tetap rapi pada judul 1 karakter maupun teks panjang 1.000 karakter tanpa spasi, kosong 0 item hingga ratusan item, layar HP `360px` satu tangan (`>= 44x44px` target sentuh, `gap >= 8px`), navigasi keyboard (`Tab`/`Escape`), dan kontras warna WCAG AA `>= 4.5:1`.

---

## 6. Standar Arsitektur MVC Laravel (`Laravel Production Standard`)
*(Wajib dipatuhi kapan pun membangun, mengintegrasikan, atau me-review backend/fullstack berbasis **Laravel MVC**, termasuk jika backend sinkronisasi StickyPlan dibangun dengan Laravel API/Inertia/Blade)*:

| Layer MVC + Domain | Tanggung Jawab Utama (Owns) | Dilarang Keras Ditaruh di Sini (Never Put Here) |
| :--- | :--- | :--- |
| **1. Route & Middleware** | Pemetaan URL, `auth`, `throttle:` (Rate Limit), binding `can:` Policy | Logika bisnis, query Eloquent langsung di closure route |
| **2. FormRequest** | Validasi skema ketat, koersi tipe, `authorize()`, mengekspor DTO via `$request->validated()` | Penulisan ke database, pengiriman email, efek samping |
| **3. Controller (Thin)** | Terima `FormRequest`, panggil **1 Single-Action / Service**, kembalikan `JsonResource` / View / Redirect | Bisnis multi-langkah, `DB::transaction`, `$request->all()`, perhitungan domain |
| **4. Action / Service** | Satu *use-case* bisnis fokus (mis. `SyncTripScheduleAction::execute()`), `DB::transaction()`, `lockForUpdate()` | Objek HTTP `Request`/`Response`, `session()`, `redirect()` |
| **5. Model (Eloquent)** | `$fillable` eksplisit, `$casts`, relasi, *local query scopes*, helper state murni | `$guarded = []`, pemanggilan HTTP pihak ketiga, logika raksasa di *booted observer* |
| **6. Policy / Gate** | Otorisasi kepemilikan objek anti-IDOR (`$user->id === $trip->user_id`) di tiap aksi baca/ubah/hapus | Placeholder `return true;` tanpa verifikasi kepemilikan |
| **7. View / API Resource** | Pembentukan JSON terfilter (`JsonResource`) atau tampilan Blade `{{ }}` / Inertia props ter-escape | Query N+1 *lazy-loading* di dalam loop template, `{!! $untrusted !!}` |

- **Guardrails Wajib Laravel:**
  1. Aktifkan `Model::shouldBeStrict(! app()->isProduction());` di `AppServiceProvider` untuk otomatis memblokir *N+1 lazy loading*, atribut tak terdaftar di `$fillable`, dan akses kolom fiktif.
  2. Selalu gunakan *eager loading* (`with(...)`) dan batasi daftar dengan `paginate()` / `cursorPaginate()` (dilarang `Model::all()` pada tabel dinamis).
  3. **Jangan membuat `BaseRepository` pembungkus Eloquent yang mubazir**; gunakan **Single-Action Classes** (`app/Actions/...`) dan **Query Classes** hanya untuk query analitik lintas tabel yang kompleks.
  4. Jalankan efek samping (email, webhook, job berat) di antrean setelah transaksi sukses: `SomeJob::dispatch($model)->afterCommit()`, serta terapkan `ShouldBeUnique` untuk mencegah eksekusi ganda.
  5. Upload file wajib divalidasi `mimes:` + `max:` + *magic bytes*, disimpan di *private disk* menggunakan `$file->hashName()` (bukan nama file asli user), dan diakses lewat *signed URL*.

---

## 7. Clean Code Discipline (Anti-Slop Engineering)
1. **Guard Clauses & Shallow Nesting:** Tangani kondisi kosong, tidak sah, atau tidak valid di bagian paling atas fungsi lalu segera `return` / `throw`. Batasi kedalaman indentasi maksimal **`<= 2` level** dan hindari `else` setelah `return`.
2. **Pisahkan Logika Domain Murni dari I/O:** Tulis kalkulasi tanggal, pengurutan jam, parser URL, dan validasi sebagai **pure functions** (input -> output deterministik tanpa menyentuh DOM/`localStorage`/network) agar dapat diuji dalam milidetik.
3. **Penamaan Eksplisit & Berniat (*Intentional Naming*):** Dilarang memakai nama kabur (`data`, `info`, `temp`, `val`, `obj`, `res`, `handle()`, `process()`). Gunakan kata benda spesifik (`sanitizedMapsUrl`, `sortedDaySheets`) dan awalan predikat pada boolean (`isValidTime`, `hasPendingBackup`, `canDeleteSheet`).
4. **Zero Magic Numbers & Strings:** Angkat semua angka batas dan kode status menjadi konstanta bernama (`MAX_ACTIVITY_TITLE_LENGTH = 80`, `SWIPE_MIN_DISTANCE_PX = 56`, `STORAGE_SCHEMA_VERSION = 1`).
5. **Fungsi Kecil & Satu Tanggung Jawab (SRP):** Jaga ukuran fungsi tetap fokus (~15–40 baris). Jangan menulis komentar yang sekadar mengulang isi kode; tulis komentar hanya untuk menjelaskan *mengapa* sebuah keputusan/batas teknis diambil.
6. **Fail Fast & Jangan Menelan Error:** Dilarang menulis `try { ... } catch (e) { return null; }` di seluruh baris kode. Tangkap exception hanya di batas sistem (*storage/file/network boundary*) dan terjemahkan menjadi pesan pemulihan yang jelas. Hapus tuntas *dead code* dan kode yang dikomentari sebelum commit.

---

## 8. Systematic Edge-Case Matrix (6 Dimensi Wajib Cek & Uji)
Sebelum menandai fitur atau tugas selesai, uji dan lindungi kode terhadap **6 dimensi edge case** berikut:

| Dimensi Edge Case | Skenario Kegagalan Nyata yang Wajib Ditangkal | Pertahanan Teknis Wajib |
| :--- | :--- | :--- |
| **1. Empty, Null & Whitespace** | Input `null`, `undefined`, `""`, `"     "` (spasi saja), array `[]`, objek `{}` | Selalu `.trim()` sebelum cek panjang karakter; bedakan nilai sah `0` dari `null`/`false` dengan strict equality (`===`). |
| **2. Numeric & Batas Kuota** | Nilai `0`, negatif `-1`, `NaN`, `MAX_SAFE_INTEGER`, pembagian `0`, urutan jam kembar (`12:00` ganda) | Validasi `Number.isInteger()` & batas bawah `>= 0`; pecah seri jam yang sama dengan `sort_order` deterministik; simpan uang (bila ada) dalam integer satuan terkecil / `DECIMAL`. |
| **3. String, Unicode & Injeksi** | Emoji 4-byte UTF-8, teks 1.000 karakter tanpa spasi yang merusak lebar kartu HP, tempelan kotor Share Google Maps, injeksi `javascript:` / formula CSV `=CMD()` | Gunakan `utf8mb4`, `overflow-wrap: anywhere` / `break-words`, ekstrak URL `https://` resmi dari teks tempelan, tolak skema berbahaya, netralisir prefix formula saat ekspor teks/CSV. |
| **4. Konkurensi & Double-Action** | Ketuk ganda tombol `Simpan` / `Hapus` dengan cepat, 2 tab browser mengedit storage, *race condition* stok/saldo di DB | Kunci status submit (`isSubmitting`), validasi sinkron sebelum tulis, gunakan `DB::transaction` + `SELECT ... FOR UPDATE` & *idempotency/unique constraint* di sisi DB. |
| **5. Waktu, Zona Waktu & Kalender** | Buka aplikasi pukul `00:30 WIB` (`UTC+7`) malah mendarat di tanggal kemarin karena `toISOString()`, tahun kabisat `29 Feb`, lompatan tanggal tidak berurutan (`25 Nov` -> `27 Nov`) | Gunakan tanggal kalender lokal murni untuk *day sheet*, simpan timestamp audit dalam ISO UTC, validasi tanggal kalender riil (tolak `2026-02-31`), navigasi berdasar lembar terdaftar. |
| **6. Jaringan, Offline & File Rusak** | Sinyal mati total di pesawat/basement, `QuotaExceededError` saat storage penuh, file `.json` berukuran raksasa / korup / berisi `__proto__` | Precache penuh Service Worker PWA, tangkap `QuotaExceededError` dengan instruksi backup, batasi file impor `<= 2 MB`, karantina data korup ke **Safe Mode** tanpa menimpa data sehat. |

### Gerbang Pengujian Wajib (Mandatory Test Gate)
Setiap modul/endpoint baru wajib dibuktikan dengan minimal **3 kategori pengujian otomatis** yang dijalankan dan diverifikasi lulus:
1. **Happy Path Test:** Alur utama berjalan sesuai *acceptance criteria*.
2. **Boundary & Invalid Input Test:** Batas karakter kosong/maksimum, format jam/tanggal salah, URL jahat, atau payload berlebih ditolak bersih.
3. **Edge-Case / State / Security Test:** Zona waktu `UTC+7` dini hari, jam kembar, pembatalan/konfirmasi 2 langkah, isolasi kepemilikan (IDOR/RLS), atau pemulihan data korup.

---

## 9. Performance, Caching & Code Modification Safety
- **Frontend & DB Performance:** Bundle awal `< 150 KB` gzipped, FCP `< 1s`, animasi GPU `transform`/`opacity` (`prefers-reduced-motion` dihormati), `loading="lazy"` pada gambar di bawah lipatan layar, *lazy-load* komponen modal/sheet berat, larangan mutlak query di dalam loop (eliminasi N+1), dan indeks proaktif pada semua *foreign key* & kolom urut.
- **Code Modification Safety:** Pertahankan alur keamanan, validator, header CSP, dan konfigurasi build yang sudah ada kecuali diminta secara eksplisit untuk direfaktor. Jangan mengarang variabel `.env` atau kolom skema tanpa memperbarui `ENV-CONTRACTS.md` dan `docs/05-BACKEND-SCHEMA.md` terlebih dahulu.
