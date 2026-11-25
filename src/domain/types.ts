export const STORAGE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_STORAGE_KEY = 'stickyplan_data_v1';
export const DEFAULT_NOTE_COLOR = 'warm-yellow' as const;

export const MAX_TRIP_TITLE_LENGTH = 60;
export const MAX_DAY_SUMMARY_LENGTH = 100;
export const MAX_ACTIVITY_TITLE_LENGTH = 80;
export const MAX_ACTIVITY_DESCRIPTION_LENGTH = 1000;
export const MAX_MAPS_URL_LENGTH = 2048;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export const SWIPE_MIN_DISTANCE_PX = 60;
export const SWIPE_DIRECTION_RATIO = 1.5;

export const NOTE_COLORS = [
  'warm-yellow',
  'mint',
  'cream',
  'soft-blue',
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export interface TripInfo {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  start_time: string;
  title: string;
  description: string | null;
  maps_url: string | null;
}

export interface DaySheet {
  id: string;
  date: string;
  note_color: NoteColor;
  day_summary: string | null;
  items: ItineraryItem[];
}

export interface StickyPlanStoreV1 {
  schema_version: typeof STORAGE_SCHEMA_VERSION;
  last_exported_at?: string | null;
  trip: TripInfo;
  day_sheets: DaySheet[];
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
