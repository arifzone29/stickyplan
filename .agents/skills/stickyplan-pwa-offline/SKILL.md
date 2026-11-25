---
name: stickyplan-pwa-offline
description: Architecture and implementation rules for StickyPlan's offline-first PWA setup (vite-plugin-pwa / Workbox), versioned local storage repository, QuotaExceededError handling, Safe Mode recovery, strict JSON export/import validation, and WhatsApp-ready text backup. Activate whenever working on storage, data schema, backup/restore, service workers, or PWA manifest.
---

# StickyPlan Offline-First PWA & Data Safety Skill

Use this skill whenever implementing or testing StickyPlan's data layer, JSON import/export, text backup, or Progressive Web App offline capabilities.

## 1. Relational Client-Side Schema (`schema_version: 1`)

Wrap all storage access behind a clean `ItineraryRepository` interface so `localStorage` can later swap to `IndexedDB` or Cloudflare D1 / Supabase without touching UI components.

```ts
export interface StickyPlanStoreV1 {
  schema_version: 1;
  active_trip_id: string;
  last_exported_at: string | null;
  trips: Trip[];
  day_sheets: DaySheet[];
  itinerary_items: ItineraryItem[];
}
```

### Field Constraints (Enforce at Write & Import Boundaries)
- `Trip`: `id` (string, non-empty), `title` (1..60 chars, trimmed, default `"Itinerary Saya"`), `schema_version` (`1`), `created_at` / `updated_at` (ISO 8601).
- `DaySheet`: `id`, `trip_id` (must reference an existing `Trip`), `date` (`^\d{4}-\d{2}-\d{2}$` valid calendar date, unique per `trip_id + date`), `note_color` (enum allowlist: `"warm-yellow" | "soft-cream" | "sage-mint" | "sky-pale"`), `day_summary` (nullable, max 100 chars).
- `ItineraryItem`: `id`, `day_sheet_id` (must reference an existing `DaySheet`), `start_time` (`^([01]\d|2[0-3]):[0-5]\d$`), `title` (1..80 chars, trimmed), `description` (nullable, max 1000 chars), `maps_url` (nullable, sanitized Google Maps HTTPS URL only), `sort_order` (integer >= 0), `created_at` (ISO 8601).

## 2. Storage Resilience & Safe Mode

1. **Atomic Read with Corruption Recovery:**
   - Parse `localStorage.getItem(STORAGE_KEY)` inside a boundary `try/catch`.
   - Run the strict validator on load. If JSON is malformed or fails schema validation, **do not crash with a blank screen**: keep the raw corrupted string in a separate quarantine key (`stickyplan_corrupt_snapshot`) so the user can copy/rescue raw text if needed, and render a **Safe Mode Recovery Banner** with a `Reset Safe Mode` action.
2. **Quota Protection:**
   - Catch `DOMException` (`QuotaExceededError` / `NS_ERROR_DOM_QUOTA_REACHED`) on `setItem` and surface an explicit user-facing alert advising immediate **Export JSON**.
3. **Browser Eviction Mitigation (iOS Safari / Mobile Chrome):**
   - Request persistent storage (`navigator.storage?.persist?.()`) after the user saves their first item.
   - Track `last_exported_at` and display `"Terakhir di-backup: Belum pernah"` (or localized timestamp) inside the Data Management Bottom Sheet.

## 3. Strict JSON Import & Prototype Pollution Guard

When reading an uploaded `.json` file:
1. Enforce file size cap (`<= 2 MB`) before parsing (`file.size`).
2. Parse with a reviver or recursive plain-object check that **rejects** `__proto__`, `constructor`, and `prototype` keys (`Object.prototype.hasOwnProperty`).
3. Strip unknown keys; validate every entity and foreign-key relation (`trip_id`, `day_sheet_id`) and re-sanitize every `maps_url`.
4. Offer two explicit import modes when local schedules already exist:
   - **Ganti Semua (Replace):** Replaces local store after validation (offer 1-click Export of current data right above the confirm button).
   - **Gabungkan (Merge):** Merges sheets by `date` and items by `id` (or appends non-duplicate items sorted by `start_time` + `sort_order`).

## 4. Offline PWA Configuration (`vite-plugin-pwa`)

- Use `registerType: 'autoUpdate'` with Workbox `generateSW` precaching `**/*.{js,css,html,ico,png,svg,woff2}`.
- Do **not** depend on external CDN fonts (e.g., `fonts.googleapis.com`) at runtime—either use system UI + system monospace stack (`font-variant-numeric: tabular-nums`) or bundle subsetted local `.woff2` fonts so Airplane Mode renders identically on 2nd load.
- Provide `manifest.webmanifest` with `display: "standalone"`, `orientation: "portrait"`, `theme_color`, `background_color`, and `192x192` + `512x512` (+ maskable) PNG/SVG icons.
