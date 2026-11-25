# Backend & Data Schema Document: StickyPlan

**Status:** Baseline Persiapan MVP v1.0 + Blueprint Migrasi Cloud Sync v2.0  
**Referensi Utama:** [01-PRD.md](./01-PRD.md) | [02-TRD.md](./02-TRD.md) | [ENV-CONTRACTS.md](../ENV-CONTRACTS.md)

---

## Bagian A — Skema Data Relasional Lokal (Aktif pada MVP v1.0)

Pada MVP v1.0, aplikasi bersifat **100% Client-Side Offline-First** menggunakan penyimpanan lokal terversioning di balik abstraksi `ItineraryRepository`. Struktur tabel dirancang **1:1 relasional** agar perpindahan ke PostgreSQL / Supabase / Cloudflare D1 di masa depan tidak mengubah logika domain.

### 1. Amplop Penyimpanan Lokal v2.0 (`StickyPlanDataV1` — `stickyplan_data_v1`)

Kunci `localStorage`: `stickyplan_data_v1` (dengan migrasi otomatis dari `stickyplan_v1:store` bila ada jadwal pengguna, atau muat otomatis jadwal default **Audit Perum LKBN ANTARA Biro Lampung**).

```ts
export interface StickyPlanDataV1 {
  schema_version: 1;
  last_exported_at: string | null;
  trip: {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
  };
  day_sheets: Array<{
    id: string;
    date: string; // YYYY-MM-DD
    note_color: 'warm-yellow' | 'mint' | 'cream' | 'soft-blue';
    day_summary: string; // max 100 chars ('' jika kosong)
    items: Array<{
      id: string;
      start_time: string; // HH:mm
      title: string; // max 80 chars
      description: string; // max 1000 chars ('' jika kosong)
      maps_url: string | null;
    }>;
  }>;
}
```
*(Validator Impor JSON juga tetap menerima format relasional datar v1 secara mundur / backward-compatible).*

### 2. Definisi Entitas, Tipe, & Batas Validasi

#### Tabel 1: `trips`
| Kolom | Tipe | Wajib | Aturan & Batas Validasi |
| :--- | :--- | :--- | :--- |
| `id` | `string (UUID v4)` | Ya | Primary Key (`crypto.randomUUID()`) |
| `title` | `string` | Ya | Trim spasi, panjang `1..60` karakter (default: `"Itinerary Saya"`) |
| `schema_version` | `1` | Ya | Literal integer `1` |
| `created_at` | `string (ISO 8601)` | Ya | Timestamp pembuatan valid |
| `updated_at` | `string (ISO 8601)` | Ya | Diperbarui setiap perubahan pada trip/sheet/item |

#### Tabel 2: `day_sheets`
| Kolom | Tipe | Wajib | Aturan & Batas Validasi |
| :--- | :--- | :--- | :--- |
| `id` | `string (UUID v4)` | Ya | Primary Key |
| `trip_id` | `string (UUID v4)` | Ya | Foreign Key -> `trips.id` (`ON DELETE CASCADE`) |
| `date` | `string (YYYY-MM-DD)` | Ya | Kalender lokal valid (`2000-01-01` s.d. `2100-12-31`), **UNIQUE (`trip_id`, `date`)** |
| `note_color` | `NoteColor` | Ya | Allowlist enum: `"warm-yellow" \| "soft-cream" \| "sage-mint" \| "sky-pale"` (default `"warm-yellow"`) |
| `day_summary` | `string \| null` | Tidak | Trim spasi, maks `100` karakter (`null` jika kosong) |

#### Tabel 3: `itinerary_items`
| Kolom | Tipe | Wajib | Aturan & Batas Validasi |
| :--- | :--- | :--- | :--- |
| `id` | `string (UUID v4)` | Ya | Primary Key |
| `day_sheet_id` | `string (UUID v4)` | Ya | Foreign Key -> `day_sheets.id` (`ON DELETE CASCADE`) |
| `start_time` | `string (HH:mm)` | Ya | Regex ketat `^([01]\d\|2[0-3]):[0-5]\d$` (24 jam) |
| `title` | `string` | Ya | Trim spasi, panjang `1..80` karakter |
| `description` | `string \| null` | Tidak | Maks `1.000` karakter (`null` jika kosong) |
| `maps_url` | `string \| null` | Tidak | Maks `2.048` karakter; **wajib lolos `sanitizeMapsUrl()` (`https:` + domain Google Maps resmi)** |
| `sort_order` | `number (int >= 0)` | Ya | Pemecah seri deterministik untuk jam mulai yang sama |
| `created_at` | `string (ISO 8601)` | Ya | Timestamp pembuatan valid |

### 3. Aturan Strict DTO Allow-Listing & Anti-Mass Assignment

Setiap mutasi form maupun proses Import JSON **dilarang keras** meneruskan objek mentah (`...rawInput`):
1. **DTO Konstruksi Eksplisit:** Validator hanya mengekstrak field yang diizinkan (`const { start_time, title, description, maps_url } = parseActivityDto(raw)`), membuang seluruh properti asing secara otomatis.
2. **Blokir Prototype Pollution:** Saat membaca file Import JSON (`<= 2 MB`), rekursif tolak objek apa pun yang memiliki own-property `__proto__`, `constructor`, atau `prototype`.
3. **Integritas Relasional Sebelum Commit:** Tolak seluruh paket impor jika terdapat `day_sheet.trip_id` yatim (*orphan*), duplikasi `(trip_id, date)`, atau `item.day_sheet_id` yang tidak merujuk ke `day_sheets` yang sah. Kegagalan impor tidak boleh memodifikasi state aktif sedikit pun.

---

## Bagian B — Blueprint Keamanan Database & RLS (Siap Pakai untuk Cloud Sync v2.0+)

Apabila di fase berikutnya StickyPlan dihubungkan ke **PostgreSQL / Supabase**, seluruh aturan keamanan wajib (Prepared Statements, RLS di semua tabel, 1-operasi-1-policy dengan `(SELECT auth.uid())`, proteksi kolom sensitif, dan indeks performa anti-N+1) dikunci dengan skema migrasi berikut:

### 1. Aturan Query Aplikasi (Anti-SQL Injection & Anti-N+1)
- **Prepared Statements Mutlak:** Dilarang keras menggabungkan variabel input ke dalam string SQL (`+` atau `` `${input}` ``). Wajib menggunakan parameter terikat (`$1, $2` atau SDK query builder berparameter) serta *whitelist* kolom `ORDER BY`.
- **Akun Database & Password:** Aplikasi wajib memakai role terbatas (*least privilege*, bukan superuser `postgres`), koneksi terenkripsi TLS, dan autentikasi pengguna wajib menggunakan hash **Argon2id / Bcrypt** (dikelola Supabase Auth / server auth).
- **Eliminasi N+1:** Ambil seluruh jadwal trip aktif dalam 1 *relational query* terindeks (mis. `.from('trips').select('*, day_sheets(*, itinerary_items(*))').eq('id', tripId)`), dilarang melakukan query `itinerary_items` di dalam loop `day_sheets.map(...)`.

### 2. DDL SQL Terproteksi (RLS + Trigger Kepemilikan + Indeks)

```sql
-- 1. Tabel trips
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title varchar(60) NOT NULL DEFAULT 'Itinerary Saya' CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
  schema_version smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabel day_sheets
CREATE TABLE public.day_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date date NOT NULL,
  note_color varchar(24) NOT NULL DEFAULT 'warm-yellow'
    CHECK (note_color IN ('warm-yellow', 'soft-cream', 'sage-mint', 'sky-pale')),
  day_summary varchar(100),
  UNIQUE (trip_id, date)
);

-- 3. Tabel itinerary_items
CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_sheet_id uuid NOT NULL REFERENCES public.day_sheets(id) ON DELETE CASCADE,
  start_time char(5) NOT NULL CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  title varchar(80) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  description varchar(1000),
  maps_url varchar(2048) CHECK (maps_url IS NULL OR maps_url LIKE 'https://%'),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Indeks Proaktif (RLS Foreign Keys + Urutan Baca Kronologis)
CREATE INDEX idx_trips_user_id ON public.trips (user_id);
CREATE INDEX idx_day_sheets_user_id ON public.day_sheets (user_id);
CREATE INDEX idx_day_sheets_trip_date ON public.day_sheets (trip_id, date ASC);
CREATE INDEX idx_itinerary_items_user_id ON public.itinerary_items (user_id);
CREATE INDEX idx_itinerary_items_sheet_sort ON public.itinerary_items (day_sheet_id, start_time ASC, sort_order ASC);

-- 5. Proteksi Kolom Kepemilikan (Cegah mutasi user_id / created_at dari klien)
CREATE OR REPLACE FUNCTION public.prevent_owner_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Modifying user_id is forbidden';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trips_immutable_owner BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_mutation();
CREATE TRIGGER trg_day_sheets_immutable_owner BEFORE UPDATE ON public.day_sheets
  FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_mutation();
CREATE TRIGGER trg_items_immutable_owner BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_mutation();

-- 6. Wajib Aktifkan Row Level Security (RLS) di SEMUA Tabel
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- 7. Kebijakan Granular (1 Operasi = 1 Policy, Subquery Cached auth.uid())
-- Tabel: trips
CREATE POLICY trips_select_own ON public.trips FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY trips_insert_own ON public.trips FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY trips_update_own ON public.trips FOR UPDATE
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY trips_delete_own ON public.trips FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Tabel: day_sheets
CREATE POLICY day_sheets_select_own ON public.day_sheets FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY day_sheets_insert_own ON public.day_sheets FOR INSERT WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = (SELECT auth.uid()))
);
CREATE POLICY day_sheets_update_own ON public.day_sheets FOR UPDATE
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY day_sheets_delete_own ON public.day_sheets FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Tabel: itinerary_items
CREATE POLICY items_select_own ON public.itinerary_items FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY items_insert_own ON public.itinerary_items FOR INSERT WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.day_sheets ds WHERE ds.id = day_sheet_id AND ds.user_id = (SELECT auth.uid()))
);
CREATE POLICY items_update_own ON public.itinerary_items FOR UPDATE
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY items_delete_own ON public.itinerary_items FOR DELETE USING ((SELECT auth.uid()) = user_id);
```
