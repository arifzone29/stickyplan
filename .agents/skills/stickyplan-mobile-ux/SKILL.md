---
name: stickyplan-mobile-ux
description: Mobile-first UI/UX, touch gesture, accessibility, and Google Maps URL security specifications for StickyPlan. Activate whenever designing or coding StickyPlan components, sticky note cards, date pill navigation, swipe gestures, bottom sheets, or Google Maps deep-links.
---

# StickyPlan Mobile-First UX & Maps Security Skill

Use this skill whenever building or reviewing StickyPlan's interface, touch interactions, and Google Maps link handling.

## 1. Anti-Slop Sticky Card Visual System (PRD Blind Spot #2)

- **Information Density Wins:** Avoid thick decorative paper borders, tilted card rotations, heavy drop shadows, cursive handwriting fonts, or AI-slop gradients/glows.
- **Warm Paper Palette (WCAG AA >= 4.5:1 Contrast Mandatory):**
  - App canvas background: warm neutral stone (`#F4F1EA`), never stark `#FFFFFF` glare.
  - Default Sticky Sheet (`warm-yellow`): soft warm paper `#FFF9DB` / `#FEF6C7` paired with deep ink `#1C1917` (contrast > 14:1) and secondary muted ink `#57534E` (contrast > 6:1).
  - Subtle paper cue: 1px warm border (`#E7DCAB`), crisp subtle elevation, subtle top-edge accent bar.
- **Typography & Time Alignment:**
  - Time column (`HH:mm` 24-hour): fixed width (`3.5rem`), `font-variant-numeric: tabular-nums` + monospace/semi-mono weight so all activity times align vertically down the sheet.
  - Activity title: clean geometric/humanist sans, `15px–16px`, `line-height: 1.35`, up to 2 lines cleanly before wrapping, with subtle map-pin indicator when `maps_url` exists.

## 2. One-Handed Ergonomics & Navigation (PRD Blind Spot #3)

- **3-Way Date Navigation:**
  1. **Top Date Pill Strip:** Horizontally scrollable (`overflow-x: auto`, hidden scrollbar, `scroll-Into-View` active pill), showing compact pills (`Rab 25 Nov`, `Kam 26 Nov`) + `+ Tanggal` button.
  2. **Card Swipe Left/Right:** GPU-friendly `transform: translate3d(...)` & `opacity` transition. Require directional lock: `Math.abs(dx) >= 56` and `Math.abs(dx) > Math.abs(dy) * 1.8`. Ignore touches starting inside interactive controls, scrollable horizontal strips, or active text selection. Respect `prefers-reduced-motion`.
  3. **Bottom Thumb Bar:** Sticky bottom bar (`padding-bottom: env(safe-area-inset-bottom)`) with `Prev` (left), primary `+ Kegiatan` CTA (center), and `Next` (right). Every interactive tap target MUST be at least **44x44 px**.
- **Registered-Sheet Stepping:** `Prev`/`Next` move strictly across existing `day_sheets` sorted by `date` (e.g., `2026-11-25` -> `2026-11-27` directly). Never trap the user on auto-generated empty dates.
- **Keyboard-Safe Bottom Sheets:**
  - Use `max-h-[88dvh]` flex column layout with scrollable body and sticky bottom action bar so mobile virtual keyboards never cover the `Simpan` button.
  - Delete actions (`Hapus Kegiatan`, `Hapus Tanggal`) require explicit 2-step confirmation; deleting a date must display the exact count of activities that will be deleted with it.

## 3. Smart Google Maps Paste Parser & Strict Sanitizer

Users frequently paste raw "Share" text from the Google Maps mobile app (e.g., `"Grand Indonesia\nhttps://maps.app.goo.gl/xyz123"`) or type a plain venue name (`"Stasiun Gambir"`).

### Parsing Pipeline
1. Trim input. If empty, store `null`.
2. Search for the first `https://[^\s"'<>]+` substring inside pasted text (strips trailing punctuation like `)` or `,` if unmatched).
3. If an `https://` URL is found, validate with `new URL(candidate)`:
   - Protocol MUST be `"https:"` (reject `javascript:`, `data:`, `http:`, etc.).
   - Hostname MUST match allowlist:
     - `maps.app.goo.gl`
     - `maps.google.com`, `maps.google.co.id`
     - `google.com`, `www.google.com`, `google.co.id`, `www.google.co.id`, `goo.gl` -> ONLY when `pathname.startsWith("/maps")`.
   - If valid, return normalized `url.toString()`.
   - If URL points to an untrusted host/protocol, reject with a clear validation message in Indonesian.
4. If input contains **plain text without any URL** (and no `: ` scheme injection), offer/convert to safe Google Maps search URL:
   `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedText)}`
   and show a live preview chip (`"Akan dicari di Google Maps: <nama tempat>"`) in the form so the user sees exactly what will open.
5. Render the deep-link button exclusively as `<a href={safeMapsUrl} target="_blank" rel="noopener noreferrer">Buka di Google Maps</a>`.
