# Design System & UI/UX Specification: StickyPlan

**Versi Dokumen:** 1.0  
**Referensi Utama:** `PRD-StickyPlan.md` (v2.0) & Prototipe `StickyPlan.jsx`  
**Pendekatan Desain:** Mobile-First, Tactile Paper Minimalism, High-Contrast Accessibility

---

## 1. Filosofi & Prinsip Visual

Desain **StickyPlan** memadukan kehangatan fisik *sticky note* kertas dengan ketegasan antarmuka utilitas modern. Fokus utamanya adalah **keterbacaan instan dalam satu genggaman tangan (*one-handed ergonomics*)** saat pengguna berada di perjalanan.

* **Content Over Decoration:** Estetika *sticky note* diwujudkan melalui palet warna kertas pastel lembut, batas garis tipis, dan elevasi halus—bukan melalui margin tebal, *font* tulisan tangan yang sulit dibaca, atau tekstur berat.
* **Thumb-Zone Priority:** Aksi yang paling sering dipakai (`Prev`, `+ Kegiatan`, `Next`) dikunci di area bawah layar agar mudah dijangkau ibu jari.
* **Progressive Disclosure:** Informasi padat (deskripsi panjang, tombol rute peta, kontrol ubah urutan, edit, hapus) disembunyikan rapi di dalam *accordion* agar daftar kegiatan harian tetap ringkas dan cepat dipindai (*scannable*).

---

## 2. Layout, Grid, & Arsitektur Layer (Z-Index)

### A. Kerangka Layar (Viewport Shell)
* **Outer Canvas (Desktop/Tablet):** `bg-stone-100` (`#F5F5F4`) untuk membingkai tampilan mobile di tengah layar.
* **App Container:** `max-w-md mx-auto min-h-[100dvh] bg-stone-50 shadow-xl shadow-stone-300/60 flex flex-col relative pb-24`.
  * Menggunakan `100dvh` (Dynamic Viewport Height) agar tinggi layar tidak terpotong oleh *address bar* browser HP.
  * Padding bawah `pb-24` (`96px`) memberi ruang aman agar daftar paling bawah tidak tertutup *Bottom Navigation Bar*.

### B. Wireframe Struktur Layar Utama
```text
┌─────────────────────────────────────────┐
│ [StickyPlan]                     [ ⚙️ ] │  ← Top Bar (Sticky, z-20)
│ Audit Perum LKBN ANTARA... ✎            │
├─────────────────────────────────────────┤
│ (26 Nov)  (27 Nov)  (+ Tanggal)         │  ← Date Pill Strip (Horizontal Scroll)
├─────────────────────────────────────────┤
│  ╭───────────────────────────────────╮  │
│  │ [Hari 1 dari 2]         ● ● ● ●   │  │  ← Sticky Note Card (Swipeable)
│  │ Kamis, 26 Nov 2026                │  │
│  │ Hari 1: Kedatangan & Mitra ✎      │  │
│  │ 8 kegiatan       [⇅ Urutkan Jam]  │  │
│  ├───────────────────────────────────┤  │
│  │ ⋮⋮ [10:30] Penjemputan...  📍  ⌄  │  │  ← Collapsed Item Row
│  ├───────────────────────────────────┤  │
│  │ ⋮⋮ [14:00] Makan siang...  📍  ⌃  │  │  ← Expanded Item Row
│  │    14.00–14.30 | Di Mbok Wito.    │  │
│  │    [ 📍 Buka di Google Maps ↗ ]   │  │
│  │    [↑][↓]        [✎ Edit][🗑 Hapus]│  │
│  ╰───────────────────────────────────╯  │
│     Geser kartu kiri/kanan atau Prev    │
├─────────────────────────────────────────┤
│ [ < Prev ]  [ + Kegiatan ]  [ Next > ]  │  ← Bottom Nav Bar (Fixed, z-30)
└─────────────────────────────────────────┘
```

### C. Hierarki Layer (`z-index`)
| Layer | Nilai `z-index` | Elemen |
| :--- | :--- | :--- |
| **Base Content** | `z-0` / `auto` | Date Pill Strip, Sticky Note Card, Daftar Kegiatan |
| **Sticky Header** | `z-20` | Top Bar dengan `backdrop-blur-sm` (`bg-stone-50/95`) |
| **Fixed Navigation** | `z-30` | Bottom Navigation Bar (`bg-white/95 backdrop-blur-md`) |
| **Overlay Sheets** | `z-40` | Bottom Sheet Form Kegiatan, Tambah Tanggal, & Kelola Data |
| **Critical Layer** | `z-50` | Dialog Konfirmasi Kustom & Toast Notification |

---

## 3. Design Tokens: Warna & Tema

### A. Palet Netral & Aksi Utama (UI Chrome)
Seluruh elemen pembungkus aplikasi menggunakan keluarga warna **Stone** (abu-abu hangat) agar selaras dengan nuansa kertas.

| Token | Kelas Tailwind | Kode Hex | Penggunaan |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `bg-stone-100` | `#F5F5F4` | Latar belakang luar (layar lebar) |
| `bg-shell` | `bg-stone-50` | `#FAFAF9` | Latar belakang utama aplikasi & Top Bar |
| `bg-surface` | `bg-white` | `#FFFFFF` | Bottom Nav, Bottom Sheet, input form, pil non-aktif |
| `border-subtle` | `border-stone-200` | `#E7E5E4` | Garis pemisah header, kartu tombol, dan pil |
| `text-primary` | `text-stone-900` | `#1C1917` | Judul tanggal, judul kegiatan, tombol CTA utama |
| `text-secondary` | `text-stone-600` | `#57534E` | Ringkasan hari, deskripsi kegiatan, label sekunder |
| `text-muted` | `text-stone-400` | `#A8A29E` | *Drag handle*, petunjuk *swipe*, *placeholder* |
| `action-primary` | `bg-stone-900` | `#1C1917` | Tombol `+ Kegiatan`, `Simpan`, pil tanggal aktif |

### B. Warna Semantik
| Peran | Latar / Border | Teks / Ikon | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Maps / Navigasi** | `bg-emerald-600` (`#059669`) / `bg-emerald-100` | `text-white` / `text-emerald-700` | Tombol "Buka di Google Maps" & badge ikon pin lokasi |
| **Destructive / Error** | `bg-red-50` (`border-red-200`) / `bg-red-600` | `text-red-700` / `text-white` | Tombol Hapus, modal konfirmasi bahaya, toast error |
| **Highlight / Info** | `bg-amber-50` (`border-amber-200`) / `bg-amber-100` | `text-amber-900` / `text-amber-500` | Tombol `+ Tanggal`, boks panduan Bulk Input, ikon merek |

### C. Palet 4 Tema Kertas Sticky Note
Setiap tema dirancang agar teks `stone-900` di atasnya tetap memiliki rasio kontras di atas **12:1 (WCAG AAA)**.

| Tema (`note_color`) | Latar Kartu | Border Kartu | Hover / Expanded | Badge Hari | Dot Switcher |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`warm-yellow`** *(Default)* | `#FEFCE8` | `yellow-200/90` | `yellow-100/50` / `40` | `yellow-200/70` + `yellow-900` | `bg-yellow-300 border-yellow-500` |
| **`mint`** | `#ECFDF5` | `emerald-200/90` | `emerald-100/50` / `40` | `emerald-200/70` + `emerald-900` | `bg-emerald-300 border-emerald-500` |
| **`cream`** | `#FAF5F0` | `stone-200` | `stone-200/40` / `35` | `stone-200/80` + `stone-800` | `bg-orange-200 border-orange-400` |
| **`soft-blue`** | `#EFF6FF` | `sky-200/90` | `sky-100/50` / `40` | `sky-200/70` + `sky-900` | `bg-sky-300 border-sky-500` |

---

## 4. Tipografi

Menggunakan *system font stack* (`font-sans`) untuk kecepatan muat instan (0 KB *font download*) dan `font-mono` khusus untuk angka waktu serta area *Bulk Input*.

| Peran Tipografi | Ukuran & Line Height | Weight | Kelas Tailwind | Catatan Khusus |
| :--- | :--- | :--- | :--- | :--- |
| **Tanggal Utama (H2)** | `18px` / `28px` | ExtraBold (800) | `text-lg font-extrabold tracking-tight` | Hierarki visual tertinggi pada lembar aktif |
| **Judul Sheet (H3)** | `16px` / `24px` | Bold (700) | `text-base font-bold` | Header pada seluruh Bottom Sheet |
| **Judul Trip & Kegiatan** | `14px` / `snug` | Bold (700) | `text-sm font-bold leading-snug` | Trip menggunakan `truncate`; kegiatan `break-words` |
| **Badge Jam (`HH:mm`)** | `12px` / `16px` | Bold (700) | `font-mono tabular-nums text-xs font-bold` | Wajib `tabular-nums` agar lebar angka seragam |
| **Deskripsi & Tombol** | `12px` / `relaxed` | Regular / Bold | `text-xs leading-relaxed` | Deskripsi memakai `whitespace-pre-line` |
| **Badge & Hint Mikro** | `11px` / `16px` | Medium / Bold | `text-[11px] font-medium` | Label "Hari X dari Y", jumlah kegiatan, panduan input |
| **App Kicker** | `10px` / `14px` | Bold (700) | `text-[10px] font-bold uppercase tracking-wider` | Label merek "STICKYPLAN" di atas judul trip |

---

## 5. Spesifikasi Radius, Spasi, & Ukuran Sentuh

### A. Border Radius
* **Bottom Sheet:** `rounded-t-3xl` (`24px`) — memberi kesan lembut dan modern saat naik dari bawah layar.
* **Sticky Note Card & Modal:** `rounded-2xl` (`16px`).
* **Tombol Utama, Input Form, & Tab Container:** `rounded-xl` (`12px`).
* **Tombol Sekunder (Edit/Hapus/Panah) & Tab Item:** `rounded-lg` (`8px`).
* **Badge Jam & Badge Hari:** `rounded-md` (`6px`).
* **Date Pills, Toast, Maps Indicator, & Color Dots:** `rounded-full`.

### B. Ergonomi Target Sentuh (Touch Targets)
* **Aksi Navigasi Bawah (`Prev`, `+ Kegiatan`, `Next`):** `min-h-[44px]`, tombol `Prev`/`Next` memiliki `min-w-[84px]`.
* **Tombol Pengaturan (Header):** `w-10 h-10` (`40px × 40px`).
* **Tombol Tutup Sheet (`X`):** `w-9 h-9` (`36px × 36px`) dengan area aman di sudut kanan atas.
* **Safe Area Produksi (iOS/Android):** Tambahkan `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` pada *Bottom Navigation Bar* dan *Bottom Sheet*.

---

## 6. Spesifikasi Komponen & State

### 1. Top Header Bar
* **Default State:** Menampilkan kicker merek, judul trip (terpotong rapi dengan elipsis jika panjang) + ikon pensil samar (`opacity-60`), dan tombol Pengaturan (`Settings`).
* **Inline Edit State:** Judul berubah menjadi `<input type="text">` dengan *ring* fokus `amber-400` + tombol konfirmasi centang (`Check`). Mendukung simpan lewat tombol `Enter`.

### 2. Date Pill Strip
* Bar horizontal dengan `overflow-x-auto no-scrollbar` dan `gap-2`.
* **State Aktif:** `bg-stone-900 text-white shadow-sm`.
* **State Non-Aktif:** `bg-white text-stone-600 border border-stone-200`.
* **Tombol `+ Tanggal`:** Selalu berada di ujung kanan dengan warna aksen `bg-amber-100 text-amber-900 border-amber-200`.

### 3. Sticky Note Card & Item Row
* **Card Header:** Berisi badge posisi hari, 4 titik pemilih warna (`scale-125` + `ring-2` pada warna aktif), tanggal lengkap lokal Indonesia, ringkasan hari (*inline editable*), serta baris meta jumlah kegiatan + tombol `Urutkan Jam` (muncul jika jumlah kegiatan $> 1$).
* **Item Row (Collapsed):**
  * Kiri: *Drag handle* (`GripVertical`, `touch-none`, `cursor-grab`).
  * Tengah: Badge jam (`bg-white/75 border-stone-900/10`) + Judul kegiatan.
  * Kanan: Indikator pin hijau bulat (opsional jika ada link Maps) + panah *chevron*.
* **Item Row (Expanded / Accordion):**
  * Panah *chevron* berotasi `$180^\circ$` (`duration-200`).
  * Panel terbuka dengan latar sedikit lebih gelap dari kertas (`theme.expandedBg`).
  * Urutan vertikal di dalam panel:
    1. Teks deskripsi (atau teks *placeholder* miring jika kosong).
    2. Tombol CTA lebar penuh **"Buka di Google Maps"** (jika valid).
    3. Baris kontrol bawah yang dipisah garis tipis: kiri untuk tombol geser **Atas (`ArrowUp`)** & **Bawah (`ArrowDown`)** (otomatis `disabled:opacity-30` di posisi pertama/terakhir); kanan untuk tombol **Edit** dan **Hapus**.
* **Drag State:**
  * Item yang sedang diseret: `opacity-40`.
  * Posisi target jatuh (*drop target*): garis indikator tegas di atas baris (`border-t-2 border-t-stone-900`).
* **Empty State:** Ikon `Calendar` (`w-8 h-8 opacity-60`), judul *"Belum ada kegiatan"*, dan petunjuk singkat menuju tombol `+ Kegiatan` / *Bulk Input*.

### 4. Bottom Sheet: Tambah / Edit & Bulk Input
* **Overlay:** `bg-stone-900/50 backdrop-blur-[1px]` dengan tinggi maksimal `max-h-[88vh]` dan area isi yang bisa di-*scroll* (`overflow-y-auto`).
* **Mode Tambah:** Menyediakan *Segmented Control* 2 tab: **Satu Kegiatan** dan **Bulk Input**.
* **Mode Edit:** *Segmented Control* disembunyikan, langsung membuka form tunggal dengan data terisi dan label tombol *"Simpan Perubahan"*.
* **Bulk Input UX:**
  * Kotak panduan ringkas `bg-amber-50` di atas *textarea*.
  * *Textarea* menggunakan `font-mono text-xs` agar kolom yang dipisah tab/pipa mudah dibaca.
  * **Live Preview Box:** Muncul di bawah *textarea* (`max-h-36 overflow-y-auto`) menampilkan hitungan kegiatan terdeteksi dan daftar badge jam + judul + ikon peta secara *real-time*.
  * Tombol submit dinamis: `"Masukkan {N} Kegiatan ke Tanggal Ini"` (otomatis `disabled:opacity-40` jika 0 kegiatan terdeteksi).

### 5. Dialog Konfirmasi & Toast Notification
* **Confirm Modal:** Kartu putih terpusat (`max-w-xs rounded-2xl p-5 shadow-2xl`) dengan 2 tombol sejajar: **Batal** (`bg-stone-100`) dan **Ya, Lanjutkan** (`bg-red-600 text-white`).
* **Toast:** Kapsul mengambang di bagian atas tengah (`fixed top-4 left-1/2 -translate-x-1/2 rounded-full`), durasi tampil 2,8 detik. Warna `bg-stone-900` untuk sukses/info dan `bg-red-600` untuk error.

---

## 7. Interaksi, Gestur, & Gerakan (Motion)

| Interaksi | Mekanisme & Parameter | Tujuan UX |
| :--- | :--- | :--- |
| **Swipe Ganti Tanggal** | Dipicu jika `$|dx| > 60\text{px}$` DAN `$|dx| > |dy| \times 1.5$`. | Mencegah perpindahan hari yang tidak disengaja saat pengguna sedang men-*scroll* daftar vertikal. |
| **Tactile Button Press** | `active:scale-95` (tombol kecil) / `active:scale-[0.99]` (tombol lebar). | Memberi umpan balik fisik instan saat disentuh di layar HP. |
| **Accordion Chevron** | `transition-transform duration-200` + `rotate-180`. | Menunjukkan arah buka/tutup secara halus pada 60 FPS. |
| **Theme Switching** | `transition-colors duration-200` pada kartu utama. | Perpindahan warna kertas terasa natural, tidak berkedip kasar. |
| **Touch Drag (Produksi)** | Gunakan `@dnd-kit` dengan `TouchSensor` (aktivasi khusus pada *drag handle* atau *delay* `150ms`, toleransi gerak `5px`). | Memastikan *drag-and-drop* bekerja mulus di iOS Safari & Android Chrome tanpa memblokir *scroll* halaman. |

---

## 8. Inventaris Ikon (`lucide-react`)

Semua ikon menggunakan ketebalan garis konsisten (*default stroke 2px*) dengan skala ukuran terstandar:

* **Navigasi & Arah:** `ChevronLeft`, `ChevronRight`, `ChevronDown`, `ArrowUp`, `ArrowDown`, `ArrowUpDown` (`14px`–`16px`).
* **Aksi Utama & Edit:** `Plus`, `Edit2`, `Trash2`, `Check`, `X`, `GripVertical` (`12px`–`16px`).
* **Lokasi & Eksternal:** `MapPin`, `ExternalLink` (`14px`–`16px`).
* **Data, Sistem, & Merek:** `Layers` (Logo kicker), `Settings`, `FileText` (Bulk Input), `Calendar` (Empty state), `Download`, `Upload`, `RotateCcw`.

---

## 9. Checklist Kualitas UI/UX & Aksesibilitas (Pre-Release)

- [ ] **Kontras:** Seluruh teks di atas 4 warna kertas memenuhi rasio kontras minimum WCAG AA (terverifikasi $> 12:1$).
- [ ] **No Horizontal Scroll:** Tidak ada elemen yang meluber keluar lebar layar pada viewport sekecil `320px` (iPhone SE).
- [ ] **Keyboard & Focus:** Seluruh tombol dan *input* memiliki indikator fokus jelas (`focus:ring-2`), tombol `Escape` menutup *Bottom Sheet*/modal aktif, dan `Enter` menyimpan *inline edit*.
- [ ] **Screen Reader:** Seluruh tombol ikon dilengkapi `aria-label`, baris kegiatan memiliki `aria-expanded`, dan *sheet*/modal memiliki `role="dialog" aria-modal="true"`.
- [ ] **Touch Ergonomics:** Seluruh kontrol di *Bottom Navigation Bar* memiliki area klik minimal `44×44 px` dan aman dari *home indicator* perangkat mobile.