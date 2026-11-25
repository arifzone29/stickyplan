export const STORAGE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_TRIP_TITLE = 'Itinerary Saya';
export const DEFAULT_NOTE_COLOR = 'warm-yellow' as const;

export const MAX_TRIP_TITLE_LENGTH = 60;
export const MAX_DAY_SUMMARY_LENGTH = 100;
export const MAX_ACTIVITY_TITLE_LENGTH = 80;
export const MAX_ACTIVITY_DESCRIPTION_LENGTH = 1000;
export const MAX_MAPS_URL_LENGTH = 2048;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export const SWIPE_MIN_DISTANCE_PX = 56;
export const SWIPE_DIRECTION_RATIO = 1.8;

export const NOTE_COLORS = [
  'warm-yellow',
  'soft-cream',
  'sage-mint',
  'sky-pale',
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export interface TripRecord {
  id: string;
  title: string;
  schema_version: typeof STORAGE_SCHEMA_VERSION;
  created_at: string;
  updated_at: string;
}

export interface DaySheetRecord {
  id: string;
  trip_id: string;
  date: string;
  note_color: NoteColor;
  day_summary: string | null;
}

export interface ItineraryItemRecord {
  id: string;
  day_sheet_id: string;
  start_time: string;
  title: string;
  description: string | null;
  maps_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface StickyPlanStoreV1 {
  schema_version: typeof STORAGE_SCHEMA_VERSION;
  active_trip_id: string;
  last_exported_at: string | null;
  trips: TripRecord[];
  day_sheets: DaySheetRecord[];
  itinerary_items: ItineraryItemRecord[];
}

export interface ValidationError {
  code: string;
  field?: string;
  message: string;
}

export type Result<T, E = ValidationError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface ActivityInputDto {
  start_time: string;
  title: string;
  description: string | null;
  maps_url: string | null;
}

export interface DaySheetInputDto {
  date: string;
  note_color: NoteColor;
  day_summary: string | null;
}

export type MapsParseResult =
  | { status: 'empty'; url: null }
  | { status: 'direct_url'; url: string }
  | { status: 'search_fallback'; url: string; query: string }
  | { status: 'invalid'; message: string };

export type ImportMode = 'replace' | 'merge';
