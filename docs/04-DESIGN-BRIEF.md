# Design Brief: StickyPlan v1.0

**Status:** Baseline Persiapan MVP v1.0  
**Referensi Utama:** [01-PRD.md](./01-PRD.md) | [03-APP-FLOW.md](./03-APP-FLOW.md)

---

## 1. Arah Identitas Visual (Product Direction)

Dirumuskan untuk menghindari *AI UI Slop* (tanpa gradasi ungu, tanpa *glassmorphism*, tanpa *glow*, tanpa emoji sebagai ikon) sekaligus menghindari *skeuomorphic sticky-note trap* yang memakan layar HP:

- **Produk:** Buku saku jadwal harian satu tangan bagi pelancong dan pelaku perjalanan dinas yang selalu siap dibaca dalam 5 detik meski tanpa sinyal.
- **Karakter:** **Tenang, presisi, taktil** (*calm, exact, tactile*).
- **Dunia Material (*World*):** Pad catatan lapangan & papan keberangkatan stasiun — kertas kuning hangat tidak menyilaukan, tinta arang pekat setajam cetakan tiket, dan kolom jam yang rata lurus seperti jadwal kereta.
- **Momen Utama (*The Rich Moment*):** Transisi menggeser lembar hari (*sheet flip/slide*) yang ringan dan berpresisi 60 FPS serta buka-tutup baris kegiatan yang langsung memperlihatkan catatan & tombol rute Google Maps.
- **Detail Khas (*Signature*):** Pita aksen tipis di tepi atas kartu *sticky* (`4px` *top tape strip*) berpadu dengan jalur jam vertikal `tabular-nums` di sisi kiri setiap kegiatan.

---

## 2. Sistem Warna & Kontras Aksesibilitas (WCAG AA >= 4.5:1)

Satu tangga warna netral hangat (*warm stone*) + permukaan kertas *sticky* berkontras tinggi + satu warna aksen fungsional:

| Token Semantik | Nilai Hex | Penggunaan | Rasio Kontras vs Teks/Latar |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#F2EFE9` | Latar belakang aplikasi (batu hangat, bebas silau putih murni) | `15.4 : 1` dgn `--ink-primary` |
| `--surface-sticky-yellow` | `#FFFBEB` | Permukaan utama kartu *Sticky Sheet* (`warm-yellow` default) | `16.8 : 1` dgn `--ink-primary` |
| `--surface-sticky-tape` | `#F59E0B` | Strip pita tipis `4px` di tepi atas kartu & penanda hari aktif | Dekorasi aksen terukur |
| `--border-sticky` | `#E6D595` | Garis tepi `1px` kartu *sticky* (satu penanda kedalaman yang bersih) | — |
| `--surface-sheet` | `#FDFCFA` | Permukaan *Bottom Sheet* & *Top Bar* | `17.1 : 1` dgn `--ink-primary` |
| `--ink-primary` | `#1C1917` | Judul kegiatan, jam utama, tanggal header | Lulus AAA (`> 15 : 1`) |
| `--ink-secondary` | `#57534E` | Deskripsi kegiatan, indikator `"Hari 1 dari 3"`, label sekunder | Lulus AA (`7.0 : 1` di atas kartu) |
| `--ink-muted` | `#78716C` | Placeholder input & metadata non-kritis | `4.5 : 1` |
| `--accent-primary` | `#0F766E` | Tombol CTA utama (`+ Kegiatan`, `Simpan`) & fokus ring (`Teal Ink`) | `5.4 : 1` dgn teks putih `#FFFFFF` |
| `--accent-maps` | `#1D4ED8` | Tombol aksi `Buka di Google Maps` (biru navigasi yang langsung dikenali) | `6.7 : 1` dgn teks putih `#FFFFFF` |
| `--danger` | `#B91C1C` | Konfirmasi `Hapus Kegiatan` / `Hapus Tanggal` & error validasi | `6.4 : 1` dgn teks putih `#FFFFFF` |

> **Aturan Kedalaman (One Depth Cue):** Kartu *sticky* menggunakan `1px solid var(--border-sticky)` dan bayangan mikro tunggal `0 2px 8px rgba(28, 25, 23, 0.06)`. Dilarang menumpuk border tebal + drop shadow pekat + ring + gradasi sekaligus.

---

## 3. Tipografi (Offline-Ready, Zero External Font Latency)

Menggunakan font sistem modern perangkat dengan fallback rapi agar **0 KB beban font jaringan** dan tampil instan saat *offline*:

- **UI & Judul (`--font-sans`):** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- **Kolom Jam & Kode Booking (`--font-mono`):** `ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace` + `font-variant-numeric: tabular-nums`

### Skala Ukuran & Ketebalan
- **Judul Tanggal Kartu:** `20px` (`1.25rem`), `font-weight: 600`, `line-height: 1.25` (contoh: `Rabu, 25 Nov 2026`).
- **Jam Kegiatan (`HH:mm`):** `14px` (`0.875rem`), `font-weight: 600`, `--font-mono`, `tabular-nums`, lebar kolom tetap `52px` rata kiri.
- **Judul Kegiatan:** `16px` (`1rem`), `font-weight: 500`, `line-height: 1.35`, maksimal 2 baris saat ringkas, penuh saat dibuka.
- **Isi Deskripsi & Form Input:** `16px` (`1rem` pada `<input>`/`<textarea>` **wajib >= 16px agar iOS Safari tidak melakukan auto-zoom paksa saat mengetik!**), deskripsi baca `14px–15px` `line-height: 1.5`.
- **Aturan Kapitalisasi:** Gunakan *Sentence case* di seluruh label dan tombol. Hindari *UPPERCASE WIDE TRACKING* generik.

---

## 4. Tata Letak, Grid 4px, & Ergonomi Satu Tangan

1. **Grid Spasi 4px:** Seluruh padding, margin, dan celah menggunakan kelipatan `4px` (`4, 8, 12, 16, 20, 24`).
2. **Proporsi Viewport Mobile & Desktop:**
   - Pada layar HP (`360px–430px`): kartu mengisi lebar penuh dengan margin samping `12px` (`px-3`) agar ruang baca judul kegiatan maksimal.
   - Pada layar tablet/desktop (`>= 640px`): kontainer terpusat nyaman (`max-w-[460px]`) di atas latar `--bg-canvas` seperti pad meja kerja yang rapi.
3. **Standar Area Sentuh Ibu Jari (*Thumb Zone*):**
   - Semua tombol interaktif (`Prev`, `+ Kegiatan`, `Next`, *Date Pill*, baris kegiatan, tombol tutup sheet) wajib memiliki tinggi & lebar sentuh minimal **`44x44 px`** (`48px` pada *Bottom Bar* utama).
   - Jarak antar tombol bersebelahan minimal **`8px` (`gap-2`)** untuk mencegah salah ketuk saat berjalan.
   - *Bottom Bar* wajib menambahkan `padding-bottom: max(12px, env(safe-area-inset-bottom))` untuk layar iPhone/Android bergaris *home indicator*.
4. **Radius Sudut Konsisten:**
   - Kartu *Sticky Sheet*: `14px`; *Bottom Sheet* atas: `20px`; Tombol & Input dalam: `10px` (*inner radius < outer radius*).
5. **Ikonografi:**
   - Hanya gunakan ikon garis SVG bersih ukuran `18px–20px` dengan ketebalan stroke seragam `1.75px–2px`. Dilarang memakai karakter emoji (`📍`, `🗑️`, `✨`) sebagai pengganti ikon kontrol UI.
