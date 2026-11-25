import { isValidCalendarDate } from './dateUtils';
import { isAllowedGoogleMapsUrl, parseSmartMapsInput } from './mapsUrl';
import { sortDaySheets, sortItineraryItems } from './sorting';
import {
  DEFAULT_NOTE_COLOR,
  MAX_ACTIVITY_DESCRIPTION_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH,
  MAX_DAY_SUMMARY_LENGTH,
  MAX_IMPORT_FILE_BYTES,
  MAX_TRIP_TITLE_LENGTH,
  NOTE_COLORS,
  STORAGE_SCHEMA_VERSION,
  type ActivityInputDto,
  type DaySheet,
  type DaySheetInputDto,
  type ItineraryItem,
  type NoteColor,
  type Result,
  type StickyPlanStoreV1,
} from './types';

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RAW_PROTO_KEY_REGEX = /"(?:__proto__|constructor|prototype)"\s*:/;
const MAX_ENTITY_COUNT = 5000;

const LEGACY_COLOR_MAP: Record<string, NoteColor> = {
  'warm-yellow': 'warm-yellow',
  mint: 'mint',
  'sage-mint': 'mint',
  cream: 'cream',
  'soft-cream': 'cream',
  'soft-blue': 'soft-blue',
  'sky-pale': 'soft-blue',
  blue: 'soft-blue',
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function containsForbiddenKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenKeys(entry));
  }
  if (!isPlainRecord(value)) return false;

  for (const key of Object.getOwnPropertyNames(value)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) return true;
    if (containsForbiddenKeys(value[key])) return true;
  }
  return false;
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  return !Number.isNaN(Date.parse(value));
}

function isNonEmptyId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length >= 1 &&
    value.length <= 128
  );
}

export function normalizeNoteColor(value: unknown): NoteColor | null {
  if (typeof value !== 'string') return null;
  return LEGACY_COLOR_MAP[value.trim()] ?? null;
}

export function isNoteColor(value: unknown): value is NoteColor {
  return (
    typeof value === 'string' &&
    (NOTE_COLORS as readonly string[]).includes(value)
  );
}

export function validateTripTitle(rawTitle: unknown): Result<string> {
  if (typeof rawTitle !== 'string') {
    return {
      ok: false,
      error: {
        code: 'INVALID_TRIP_TITLE',
        field: 'title',
        message: 'Judul perjalanan wajib diisi.',
      },
    };
  }

  const trimmed = rawTitle.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_TRIP_TITLE',
        field: 'title',
        message: 'Judul perjalanan tidak boleh kosong.',
      },
    };
  }

  if (trimmed.length > MAX_TRIP_TITLE_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'TRIP_TITLE_TOO_LONG',
        field: 'title',
        message: `Judul perjalanan maksimal ${MAX_TRIP_TITLE_LENGTH} karakter.`,
      },
    };
  }

  return { ok: true, data: trimmed };
}

export function validateDaySheetInput(
  rawInput: unknown,
): Result<DaySheetInputDto> {
  if (!isPlainRecord(rawInput)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_SHEET_PAYLOAD',
        message: 'Data lembar tanggal tidak valid.',
      },
    };
  }

  const rawDate = typeof rawInput.date === 'string' ? rawInput.date.trim() : '';
  if (!isValidCalendarDate(rawDate)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DATE',
        field: 'date',
        message: 'Pilih tanggal kalender yang valid (YYYY-MM-DD).',
      },
    };
  }

  const resolvedColor = normalizeNoteColor(
    rawInput.note_color ?? DEFAULT_NOTE_COLOR,
  );
  if (!resolvedColor) {
    return {
      ok: false,
      error: {
        code: 'INVALID_NOTE_COLOR',
        field: 'note_color',
        message: 'Warna kertas sticky tidak dikenali.',
      },
    };
  }

  let daySummary: string | null = null;
  if (rawInput.day_summary !== undefined && rawInput.day_summary !== null) {
    if (typeof rawInput.day_summary !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_DAY_SUMMARY',
          field: 'day_summary',
          message: 'Catatan singkat hari harus berupa teks.',
        },
      };
    }
    const trimmedSummary = rawInput.day_summary.trim();
    if (trimmedSummary.length > MAX_DAY_SUMMARY_LENGTH) {
      return {
        ok: false,
        error: {
          code: 'DAY_SUMMARY_TOO_LONG',
          field: 'day_summary',
          message: `Catatan singkat hari maksimal ${MAX_DAY_SUMMARY_LENGTH} karakter.`,
        },
      };
    }
    daySummary = trimmedSummary.length > 0 ? trimmedSummary : null;
  }

  return {
    ok: true,
    data: {
      date: rawDate,
      note_color: resolvedColor,
      day_summary: daySummary,
    },
  };
}

export function validateActivityInput(
  rawInput: unknown,
): Result<ActivityInputDto> {
  if (!isPlainRecord(rawInput)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ACTIVITY_PAYLOAD',
        message: 'Data kegiatan tidak valid.',
      },
    };
  }

  const startTime =
    typeof rawInput.start_time === 'string' ? rawInput.start_time.trim() : '';
  if (!TIME_24H_REGEX.test(startTime)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_START_TIME',
        field: 'start_time',
        message: 'Jam kegiatan wajib berformat 24 jam (HH:mm), misal 09:30.',
      },
    };
  }

  const title =
    typeof rawInput.title === 'string' ? rawInput.title.trim() : '';
  if (title.length === 0) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_ACTIVITY_TITLE',
        field: 'title',
        message: 'Judul kegiatan wajib diisi.',
      },
    };
  }
  if (title.length > MAX_ACTIVITY_TITLE_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'ACTIVITY_TITLE_TOO_LONG',
        field: 'title',
        message: `Judul kegiatan maksimal ${MAX_ACTIVITY_TITLE_LENGTH} karakter.`,
      },
    };
  }

  let description: string | null = null;
  if (rawInput.description !== undefined && rawInput.description !== null) {
    if (typeof rawInput.description !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_DESCRIPTION',
          field: 'description',
          message: 'Deskripsi kegiatan harus berupa teks.',
        },
      };
    }
    const trimmedDesc = rawInput.description.trim();
    if (trimmedDesc.length > MAX_ACTIVITY_DESCRIPTION_LENGTH) {
      return {
        ok: false,
        error: {
          code: 'DESCRIPTION_TOO_LONG',
          field: 'description',
          message: `Deskripsi kegiatan maksimal ${MAX_ACTIVITY_DESCRIPTION_LENGTH} karakter.`,
        },
      };
    }
    description = trimmedDesc.length > 0 ? trimmedDesc : null;
  }

  let mapsUrl: string | null = null;
  if (rawInput.maps_url !== undefined && rawInput.maps_url !== null) {
    if (typeof rawInput.maps_url !== 'string') {
      return {
        ok: false,
        error: {
          code: 'INVALID_MAPS_URL',
          field: 'maps_url',
          message: 'Tautan Google Maps harus berupa teks.',
        },
      };
    }
    const parsedMaps = parseSmartMapsInput(rawInput.maps_url);
    if (parsedMaps.status === 'invalid') {
      return {
        ok: false,
        error: {
          code: 'UNSAFE_MAPS_URL',
          field: 'maps_url',
          message: parsedMaps.message,
        },
      };
    }
    mapsUrl = parsedMaps.url;
  }

  return {
    ok: true,
    data: {
      start_time: startTime,
      title,
      description,
      maps_url: mapsUrl,
    },
  };
}

function parseImportedItem(raw: unknown): Result<ItineraryItem> {
  if (!isPlainRecord(raw) || !isNonEmptyId(raw.id)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ITEM_RECORD',
        message: 'Identitas item kegiatan tidak valid.',
      },
    };
  }

  const rawStartTime =
    typeof raw.start_time === 'string' ? raw.start_time.trim() : '';
  if (!TIME_24H_REGEX.test(rawStartTime)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ITEM_TIME',
        message: 'Format jam di dalam file backup tidak valid.',
      },
    };
  }

  const rawTitle =
    typeof raw.title === 'string'
      ? raw.title.trim().slice(0, MAX_ACTIVITY_TITLE_LENGTH)
      : '';
  if (rawTitle.length === 0) {
    return {
      ok: false,
      error: {
        code: 'EMPTY_ITEM_TITLE',
        message: 'Ditemukan kegiatan tanpa judul di dalam file backup.',
      },
    };
  }

  const rawDesc =
    typeof raw.description === 'string'
      ? raw.description.trim().slice(0, MAX_ACTIVITY_DESCRIPTION_LENGTH)
      : '';

  let sanitizedMaps: string | null = null;
  if (raw.maps_url !== null && raw.maps_url !== undefined) {
    if (
      typeof raw.maps_url !== 'string' ||
      (raw.maps_url.trim().length > 0 &&
        !isAllowedGoogleMapsUrl(raw.maps_url.trim()))
    ) {
      return {
        ok: false,
        error: {
          code: 'UNSAFE_IMPORTED_MAPS_URL',
          message: 'Ditemukan tautan lokasi tidak aman di dalam data impor.',
        },
      };
    }
    sanitizedMaps = raw.maps_url.trim() || null;
  }

  return {
    ok: true,
    data: {
      id: raw.id.trim(),
      start_time: rawStartTime,
      title: rawTitle,
      description: rawDesc.length > 0 ? rawDesc : null,
      maps_url: sanitizedMaps,
    },
  };
}

function convertLegacyFlatStore(
  rawStore: Record<string, unknown>,
): Result<StickyPlanStoreV1> {
  if (
    !Array.isArray(rawStore.trips) ||
    rawStore.trips.length === 0 ||
    !Array.isArray(rawStore.day_sheets) ||
    !Array.isArray(rawStore.itinerary_items)
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_LEGACY_STORE',
        message: 'Koleksi data backup lama tidak lengkap.',
      },
    };
  }

  const activeTripId =
    typeof rawStore.active_trip_id === 'string'
      ? rawStore.active_trip_id.trim()
      : '';
  const rawTrip =
    rawStore.trips.find(
      (t) => isPlainRecord(t) && t.id === activeTripId,
    ) ?? rawStore.trips[0];

  if (!isPlainRecord(rawTrip) || !isNonEmptyId(rawTrip.id)) {
    return {
      ok: false,
      error: { code: 'INVALID_TRIP', message: 'Data trip tidak valid.' },
    };
  }

  const titleRes = validateTripTitle(rawTrip.title);
  if (!titleRes.ok) return titleRes;

  const sheetIdSet = new Set<string>();
  const sheetsMap = new Map<string, DaySheet>();
  for (const s of rawStore.day_sheets) {
    if (!isPlainRecord(s) || !isNonEmptyId(s.id) || s.trip_id !== rawTrip.id) {
      continue;
    }
    const dtoRes = validateDaySheetInput(s);
    if (!dtoRes.ok) return dtoRes;
    const id = s.id.trim();
    sheetIdSet.add(id);
    sheetsMap.set(id, {
      id,
      date: dtoRes.data.date,
      note_color: dtoRes.data.note_color,
      day_summary: dtoRes.data.day_summary,
      items: [],
    });
  }

  for (const rawIt of rawStore.itinerary_items) {
    if (!isPlainRecord(rawIt) || typeof rawIt.day_sheet_id !== 'string') {
      return {
        ok: false,
        error: { code: 'INVALID_ITEM', message: 'Item jadwal rusak.' },
      };
    }
    const targetSheet = sheetsMap.get(rawIt.day_sheet_id.trim());
    if (!targetSheet) {
      return {
        ok: false,
        error: {
          code: 'ORPHAN_ITINERARY_ITEM',
          message: 'Ditemukan kegiatan yang merujuk ke tanggal yang tidak ada.',
        },
      };
    }
    const parsedItem = parseImportedItem(rawIt);
    if (!parsedItem.ok) return parsedItem;
    targetSheet.items.push(parsedItem.data);
  }

  const sheets = sortDaySheets([...sheetsMap.values()]).map((sheet) => ({
    ...sheet,
    items: sortItineraryItems(sheet.items),
  }));

  const nowIso = new Date().toISOString();
  return {
    ok: true,
    data: {
      schema_version: STORAGE_SCHEMA_VERSION,
      last_exported_at: isValidIsoTimestamp(rawStore.last_exported_at)
        ? rawStore.last_exported_at
        : null,
      trip: {
        id: rawTrip.id.trim(),
        title: titleRes.data,
        created_at: isValidIsoTimestamp(rawTrip.created_at)
          ? rawTrip.created_at
          : nowIso,
        updated_at: isValidIsoTimestamp(rawTrip.updated_at)
          ? rawTrip.updated_at
          : nowIso,
      },
      day_sheets: sheets,
    },
  };
}

export function validateStoreSnapshot(
  rawStore: unknown,
): Result<StickyPlanStoreV1> {
  if (!isPlainRecord(rawStore) || containsForbiddenKeys(rawStore)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_STORE_ROOT',
        message:
          'Struktur penyimpanan utama rusak atau mengandung kunci terlarang.',
      },
    };
  }

  const schemaVersion = rawStore.schema_version ?? STORAGE_SCHEMA_VERSION;
  if (schemaVersion !== STORAGE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_SCHEMA_VERSION',
        message: 'Versi format file backup tidak didukung oleh aplikasi ini.',
      },
    };
  }

  if (!isPlainRecord(rawStore.trip) && Array.isArray(rawStore.trips)) {
    return convertLegacyFlatStore(rawStore);
  }

  if (!isPlainRecord(rawStore.trip) || !Array.isArray(rawStore.day_sheets)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_COLLECTIONS',
        message: 'Data trip atau daftar lembar tanggal tidak ditemukan.',
      },
    };
  }

  if (rawStore.day_sheets.length > MAX_ENTITY_COUNT) {
    return {
      ok: false,
      error: {
        code: 'TOO_MANY_SHEETS',
        message: 'Jumlah tanggal melebihi batas aman.',
      },
    };
  }

  const rawTrip = rawStore.trip;
  const tripId = isNonEmptyId(rawTrip.id) ? rawTrip.id.trim() : 'trip-default';
  const titleRes = validateTripTitle(rawTrip.title);
  if (!titleRes.ok) return titleRes;

  const nowIso = new Date().toISOString();
  const createdAt = isValidIsoTimestamp(rawTrip.created_at)
    ? rawTrip.created_at
    : nowIso;
  const updatedAt = isValidIsoTimestamp(rawTrip.updated_at)
    ? rawTrip.updated_at
    : nowIso;

  const seenDates = new Set<string>();
  const seenSheetIds = new Set<string>();
  const seenItemIds = new Set<string>();
  const daySheets: DaySheet[] = [];

  for (const rawSheet of rawStore.day_sheets) {
    if (
      !isPlainRecord(rawSheet) ||
      !isNonEmptyId(rawSheet.id) ||
      !Array.isArray(rawSheet.items)
    ) {
      return {
        ok: false,
        error: {
          code: 'INVALID_SHEET_RECORD',
          message: 'Struktur lembar tanggal tidak valid.',
        },
      };
    }

    if (rawSheet.items.length > MAX_ENTITY_COUNT) {
      return {
        ok: false,
        error: {
          code: 'TOO_MANY_ITEMS',
          message: 'Jumlah kegiatan pada satu hari melebihi batas aman.',
        },
      };
    }

    const dtoRes = validateDaySheetInput(rawSheet);
    if (!dtoRes.ok) return dtoRes;

    const sheetId = rawSheet.id.trim();
    if (seenSheetIds.has(sheetId) || seenDates.has(dtoRes.data.date)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_DAY_SHEET',
          message: `Tanggal ${dtoRes.data.date} tercatat ganda di dalam file.`,
        },
      };
    }
    seenSheetIds.add(sheetId);
    seenDates.add(dtoRes.data.date);

    const parsedItems: ItineraryItem[] = [];
    for (const rawItem of rawSheet.items) {
      const itemRes = parseImportedItem(rawItem);
      if (!itemRes.ok) return itemRes;
      if (seenItemIds.has(itemRes.data.id)) {
        return {
          ok: false,
          error: {
            code: 'DUPLICATE_ITEM_ID',
            message: 'Ditemukan ID kegiatan ganda di dalam file.',
          },
        };
      }
      seenItemIds.add(itemRes.data.id);
      parsedItems.push(itemRes.data);
    }

    daySheets.push({
      id: sheetId,
      date: dtoRes.data.date,
      note_color: dtoRes.data.note_color,
      day_summary: dtoRes.data.day_summary,
      items: parsedItems,
    });
  }

  const lastExportedAt =
    rawStore.last_exported_at === null || rawStore.last_exported_at === undefined
      ? null
      : isValidIsoTimestamp(rawStore.last_exported_at)
        ? rawStore.last_exported_at
        : null;

  return {
    ok: true,
    data: {
      schema_version: STORAGE_SCHEMA_VERSION,
      last_exported_at: lastExportedAt,
      trip: {
        id: tripId,
        title: titleRes.data,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      day_sheets: sortDaySheets(daySheets),
    },
  };
}

export function parseAndValidateImportJson(
  jsonText: string,
  byteLength: number,
): Result<StickyPlanStoreV1> {
  if (byteLength > MAX_IMPORT_FILE_BYTES) {
    return {
      ok: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Ukuran file backup melebihi batas aman 2 MB.',
      },
    };
  }

  if (RAW_PROTO_KEY_REGEX.test(jsonText)) {
    return {
      ok: false,
      error: {
        code: 'PROTOTYPE_POLLUTION_BLOCKED',
        message: 'File ditolak karena mengandung properti objek berbahaya.',
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      ok: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Format file JSON rusak atau tidak dapat dibaca.',
      },
    };
  }

  return validateStoreSnapshot(parsed);
}
