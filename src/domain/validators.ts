import { isValidCalendarDate } from './dateUtils';
import { isAllowedGoogleMapsUrl, parseSmartMapsInput } from './mapsUrl';
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
  type DaySheetInputDto,
  type DaySheetRecord,
  type ItineraryItemRecord,
  type NoteColor,
  type Result,
  type StickyPlanStoreV1,
  type TripRecord,
} from './types';

const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RAW_PROTO_KEY_REGEX = /"(?:__proto__|constructor|prototype)"\s*:/;
const MAX_ENTITY_COUNT = 5000;

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
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= 128;
}

function isNoteColor(value: unknown): value is NoteColor {
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

  const rawColor = rawInput.note_color ?? DEFAULT_NOTE_COLOR;
  if (!isNoteColor(rawColor)) {
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
      note_color: rawColor,
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

function parseTripRecord(raw: unknown): Result<TripRecord> {
  if (!isPlainRecord(raw) || !isNonEmptyId(raw.id)) {
    return {
      ok: false,
      error: { code: 'INVALID_TRIP_RECORD', message: 'ID trip tidak valid.' },
    };
  }

  const titleRes = validateTripTitle(raw.title);
  if (!titleRes.ok) return titleRes;

  if (
    raw.schema_version !== STORAGE_SCHEMA_VERSION ||
    !isValidIsoTimestamp(raw.created_at) ||
    !isValidIsoTimestamp(raw.updated_at)
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TRIP_METADATA',
        message: 'Metadata waktu atau versi skema trip tidak valid.',
      },
    };
  }

  return {
    ok: true,
    data: {
      id: raw.id.trim(),
      title: titleRes.data,
      schema_version: STORAGE_SCHEMA_VERSION,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    },
  };
}

function parseDaySheetRecord(raw: unknown): Result<DaySheetRecord> {
  if (
    !isPlainRecord(raw) ||
    !isNonEmptyId(raw.id) ||
    !isNonEmptyId(raw.trip_id)
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_SHEET_RECORD',
        message: 'Identitas lembar tanggal tidak valid.',
      },
    };
  }

  const dtoRes = validateDaySheetInput(raw);
  if (!dtoRes.ok) return dtoRes;

  return {
    ok: true,
    data: {
      id: raw.id.trim(),
      trip_id: raw.trip_id.trim(),
      date: dtoRes.data.date,
      note_color: dtoRes.data.note_color,
      day_summary: dtoRes.data.day_summary,
    },
  };
}

function parseItineraryItemRecord(raw: unknown): Result<ItineraryItemRecord> {
  if (
    !isPlainRecord(raw) ||
    !isNonEmptyId(raw.id) ||
    !isNonEmptyId(raw.day_sheet_id)
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ITEM_RECORD',
        message: 'Identitas item kegiatan tidak valid.',
      },
    };
  }

  if (
    typeof raw.sort_order !== 'number' ||
    !Number.isInteger(raw.sort_order) ||
    raw.sort_order < 0 ||
    !isValidIsoTimestamp(raw.created_at)
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ITEM_METADATA',
        message: 'Urutan atau waktu pembuatan kegiatan tidak valid.',
      },
    };
  }

  if (raw.maps_url !== null && raw.maps_url !== undefined) {
    if (
      typeof raw.maps_url !== 'string' ||
      !isAllowedGoogleMapsUrl(raw.maps_url.trim())
    ) {
      return {
        ok: false,
        error: {
          code: 'UNSAFE_IMPORTED_MAPS_URL',
          message: 'Ditemukan tautan lokasi tidak aman di dalam data impor.',
        },
      };
    }
  }

  const dtoRes = validateActivityInput(raw);
  if (!dtoRes.ok) return dtoRes;

  return {
    ok: true,
    data: {
      id: raw.id.trim(),
      day_sheet_id: raw.day_sheet_id.trim(),
      start_time: dtoRes.data.start_time,
      title: dtoRes.data.title,
      description: dtoRes.data.description,
      maps_url: dtoRes.data.maps_url,
      sort_order: raw.sort_order,
      created_at: raw.created_at,
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
        message: 'Struktur penyimpanan utama rusak atau mengandung kunci terlarang.',
      },
    };
  }

  if (rawStore.schema_version !== STORAGE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_SCHEMA_VERSION',
        message: 'Versi format file backup tidak didukung oleh aplikasi ini.',
      },
    };
  }

  if (
    !Array.isArray(rawStore.trips) ||
    rawStore.trips.length === 0 ||
    rawStore.trips.length > MAX_ENTITY_COUNT ||
    !Array.isArray(rawStore.day_sheets) ||
    rawStore.day_sheets.length > MAX_ENTITY_COUNT ||
    !Array.isArray(rawStore.itinerary_items) ||
    rawStore.itinerary_items.length > MAX_ENTITY_COUNT
  ) {
    return {
      ok: false,
      error: {
        code: 'INVALID_COLLECTIONS',
        message: 'Koleksi trip, tanggal, atau kegiatan tidak lengkap atau melebihi batas aman.',
      },
    };
  }

  const lastExportedAt = rawStore.last_exported_at ?? null;
  if (lastExportedAt !== null && !isValidIsoTimestamp(lastExportedAt)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_EXPORT_TIMESTAMP',
        message: ' penanda waktu backup terakhir tidak valid.',
      },
    };
  }

  const trips: TripRecord[] = [];
  const tripIds = new Set<string>();
  for (const rawTrip of rawStore.trips) {
    const tripRes = parseTripRecord(rawTrip);
    if (!tripRes.ok) return tripRes;
    if (tripIds.has(tripRes.data.id)) {
      return {
        ok: false,
        error: { code: 'DUPLICATE_TRIP_ID', message: 'Ditemukan ID trip ganda.' },
      };
    }
    tripIds.add(tripRes.data.id);
    trips.push(tripRes.data);
  }

  if (
    !isNonEmptyId(rawStore.active_trip_id) ||
    !tripIds.has(rawStore.active_trip_id.trim())
  ) {
    return {
      ok: false,
      error: {
        code: 'MISSING_ACTIVE_TRIP',
        message: 'Trip aktif tidak ditemukan di dalam daftar trip.',
      },
    };
  }

  const daySheets: DaySheetRecord[] = [];
  const sheetIds = new Set<string>();
  const tripDatePairs = new Set<string>();
  for (const rawSheet of rawStore.day_sheets) {
    const sheetRes = parseDaySheetRecord(rawSheet);
    if (!sheetRes.ok) return sheetRes;
    if (!tripIds.has(sheetRes.data.trip_id)) {
      return {
        ok: false,
        error: {
          code: 'ORPHAN_DAY_SHEET',
          message: 'Ditemukan lembar tanggal tanpa referensi trip yang sah.',
        },
      };
    }
    const pairKey = `${sheetRes.data.trip_id}::${sheetRes.data.date}`;
    if (sheetIds.has(sheetRes.data.id) || tripDatePairs.has(pairKey)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_DAY_SHEET',
          message: `Tanggal ${sheetRes.data.date} tercatat ganda dalam trip yang sama.`,
        },
      };
    }
    sheetIds.add(sheetRes.data.id);
    tripDatePairs.add(pairKey);
    daySheets.push(sheetRes.data);
  }

  const items: ItineraryItemRecord[] = [];
  const itemIds = new Set<string>();
  for (const rawItem of rawStore.itinerary_items) {
    const itemRes = parseItineraryItemRecord(rawItem);
    if (!itemRes.ok) return itemRes;
    if (!sheetIds.has(itemRes.data.day_sheet_id)) {
      return {
        ok: false,
        error: {
          code: 'ORPHAN_ITINERARY_ITEM',
          message: 'Ditemukan kegiatan yang merujuk ke tanggal yang tidak ada.',
        },
      };
    }
    if (itemIds.has(itemRes.data.id)) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_ITEM_ID',
          message: 'Ditemukan ID kegiatan ganda di dalam data.',
        },
      };
    }
    itemIds.add(itemRes.data.id);
    items.push(itemRes.data);
  }

  return {
    ok: true,
    data: {
      schema_version: STORAGE_SCHEMA_VERSION,
      active_trip_id: rawStore.active_trip_id.trim(),
      last_exported_at: lastExportedAt,
      trips,
      day_sheets: daySheets,
      itinerary_items: items,
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
