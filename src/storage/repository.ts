import { getLocalDateString } from '../domain/dateUtils';
import { getNextSortOrderForTime } from '../domain/sorting';
import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_TRIP_TITLE,
  STORAGE_SCHEMA_VERSION,
  type DaySheetRecord,
  type ImportMode,
  type ItineraryItemRecord,
  type Result,
  type StickyPlanStoreV1,
} from '../domain/types';
import {
  parseAndValidateImportJson,
  validateActivityInput,
  validateDaySheetInput,
  validateStoreSnapshot,
  validateTripTitle,
} from '../domain/validators';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type BootState =
  | { status: 'ready'; store: StickyPlanStoreV1 }
  | { status: 'corrupt'; rawSnapshot: string; reason: string };

export interface ItineraryRepository {
  loadOrInitialize(): BootState;
  resetSafeMode(): Result<StickyPlanStoreV1>;
  updateTripTitle(
    store: StickyPlanStoreV1,
    rawTitle: unknown,
  ): Result<StickyPlanStoreV1>;
  addDaySheet(
    store: StickyPlanStoreV1,
    rawInput: unknown,
  ): Result<StickyPlanStoreV1>;
  updateDaySheet(
    store: StickyPlanStoreV1,
    sheetId: string,
    rawInput: unknown,
  ): Result<StickyPlanStoreV1>;
  deleteDaySheet(
    store: StickyPlanStoreV1,
    sheetId: string,
  ): Result<StickyPlanStoreV1>;
  addActivity(
    store: StickyPlanStoreV1,
    daySheetId: string,
    rawInput: unknown,
  ): Result<{ store: StickyPlanStoreV1; item: ItineraryItemRecord }>;
  updateActivity(
    store: StickyPlanStoreV1,
    itemId: string,
    rawInput: unknown,
  ): Result<StickyPlanStoreV1>;
  deleteActivity(
    store: StickyPlanStoreV1,
    itemId: string,
  ): Result<StickyPlanStoreV1>;
  markExported(store: StickyPlanStoreV1): Result<StickyPlanStoreV1>;
  importFromJson(
    currentStore: StickyPlanStoreV1,
    jsonText: string,
    byteLength: number,
    mode: ImportMode,
  ): Result<StickyPlanStoreV1>;
}

export interface RepositoryOptions {
  storage?: StorageBackend;
  namespace?: string;
  getTodayLocal?: () => string;
  generateId?: () => string;
  getNowIso?: () => string;
}

function createFallbackMemoryStorage(): StorageBackend {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, val) => {
      memory.set(key, val);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  };
}

function resolveDefaultStorage(): StorageBackend {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return createFallbackMemoryStorage();
  }
  return createFallbackMemoryStorage();
}

function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

let hasRequestedPersistence = false;
function requestPersistentStorageOnce(): void {
  if (hasRequestedPersistence) return;
  hasRequestedPersistence = true;
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.persist === 'function'
  ) {
    void navigator.storage.persist().catch(() => undefined);
  }
}

export function createLocalStorageRepository(
  options: RepositoryOptions = {},
): ItineraryRepository {
  const storage = options.storage ?? resolveDefaultStorage();
  const envNamespace =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_STORAGE_NAMESPACE === 'string' &&
    import.meta.env.VITE_STORAGE_NAMESPACE.trim().length > 0
      ? import.meta.env.VITE_STORAGE_NAMESPACE.trim()
      : 'stickyplan_v1';

  const namespace = options.namespace ?? envNamespace;
  const storeKey = `${namespace}:store`;
  const corruptBackupKey = `${namespace}:corrupt_backup`;

  const getToday = options.getTodayLocal ?? (() => getLocalDateString());
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const getNowIso = options.getNowIso ?? (() => new Date().toISOString());

  function buildSeedStore(): StickyPlanStoreV1 {
    const nowIso = getNowIso();
    const tripId = generateId();
    const sheetId = generateId();

    return {
      schema_version: STORAGE_SCHEMA_VERSION,
      active_trip_id: tripId,
      last_exported_at: null,
      trips: [
        {
          id: tripId,
          title: DEFAULT_TRIP_TITLE,
          schema_version: STORAGE_SCHEMA_VERSION,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ],
      day_sheets: [
        {
          id: sheetId,
          trip_id: tripId,
          date: getToday(),
          note_color: DEFAULT_NOTE_COLOR,
          day_summary: null,
        },
      ],
      itinerary_items: [],
    };
  }

  function persistStore(
    nextStore: StickyPlanStoreV1,
  ): Result<StickyPlanStoreV1> {
    try {
      storage.setItem(storeKey, JSON.stringify(nextStore));
      requestPersistentStorageOnce();
      return { ok: true, data: nextStore };
    } catch (err) {
      if (isQuotaExceededError(err)) {
        return {
          ok: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message:
              'Penyimpanan browser penuh. Segera unduh Backup JSON agar data perjalanan Anda tetap aman.',
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'STORAGE_WRITE_FAILED',
          message:
            'Gagal menyimpan perubahan ke penyimpanan perangkat. Coba matikan mode penyamaran penuh atau unduh Backup JSON.',
        },
      };
    }
  }

  function touchActiveTripTimestamp(
    store: StickyPlanStoreV1,
    nowIso: string,
  ): StickyPlanStoreV1['trips'] {
    return store.trips.map((trip) =>
      trip.id === store.active_trip_id
        ? { ...trip, updated_at: nowIso }
        : trip,
    );
  }

  return {
    loadOrInitialize(): BootState {
      let raw: string | null = null;
      try {
        raw = storage.getItem(storeKey);
      } catch {
        const fallbackSeed = buildSeedStore();
        return { status: 'ready', store: fallbackSeed };
      }

      if (raw === null) {
        const seed = buildSeedStore();
        persistStore(seed);
        return { status: 'ready', store: seed };
      }

      const validated = parseAndValidateImportJson(raw, raw.length);
      if (!validated.ok) {
        try {
          storage.setItem(corruptBackupKey, raw);
        } catch {
          // Quarantine snapshot is best-effort when storage is full
        }
        return {
          status: 'corrupt',
          rawSnapshot: raw,
          reason: validated.error.message,
        };
      }

      return { status: 'ready', store: validated.data };
    },

    resetSafeMode(): Result<StickyPlanStoreV1> {
      const fresh = buildSeedStore();
      return persistStore(fresh);
    },

    updateTripTitle(
      store: StickyPlanStoreV1,
      rawTitle: unknown,
    ): Result<StickyPlanStoreV1> {
      const titleRes = validateTripTitle(rawTitle);
      if (!titleRes.ok) return titleRes;

      const nowIso = getNowIso();
      const nextStore: StickyPlanStoreV1 = {
        ...store,
        trips: store.trips.map((trip) =>
          trip.id === store.active_trip_id
            ? { ...trip, title: titleRes.data, updated_at: nowIso }
            : trip,
        ),
      };
      return persistStore(nextStore);
    },

    addDaySheet(
      store: StickyPlanStoreV1,
      rawInput: unknown,
    ): Result<StickyPlanStoreV1> {
      const dtoRes = validateDaySheetInput(rawInput);
      if (!dtoRes.ok) return dtoRes;

      const duplicate = store.day_sheets.some(
        (sheet) =>
          sheet.trip_id === store.active_trip_id &&
          sheet.date === dtoRes.data.date,
      );
      if (duplicate) {
        return {
          ok: false,
          error: {
            code: 'DUPLICATE_DATE',
            field: 'date',
            message: 'Tanggal tersebut sudah terdaftar di perjalanan ini.',
          },
        };
      }

      const nowIso = getNowIso();
      const newSheet: DaySheetRecord = {
        id: generateId(),
        trip_id: store.active_trip_id,
        date: dtoRes.data.date,
        note_color: dtoRes.data.note_color,
        day_summary: dtoRes.data.day_summary,
      };

      return persistStore({
        ...store,
        trips: touchActiveTripTimestamp(store, nowIso),
        day_sheets: [...store.day_sheets, newSheet],
      });
    },

    updateDaySheet(
      store: StickyPlanStoreV1,
      sheetId: string,
      rawInput: unknown,
    ): Result<StickyPlanStoreV1> {
      const target = store.day_sheets.find((s) => s.id === sheetId);
      if (!target) {
        return {
          ok: false,
          error: {
            code: 'SHEET_NOT_FOUND',
            message: 'Lembar tanggal tidak ditemukan.',
          },
        };
      }

      const dtoRes = validateDaySheetInput(rawInput);
      if (!dtoRes.ok) return dtoRes;

      const duplicate = store.day_sheets.some(
        (s) =>
          s.id !== sheetId &&
          s.trip_id === target.trip_id &&
          s.date === dtoRes.data.date,
      );
      if (duplicate) {
        return {
          ok: false,
          error: {
            code: 'DUPLICATE_DATE',
            field: 'date',
            message: 'Tanggal tersebut sudah terdaftar di perjalanan ini.',
          },
        };
      }

      const nowIso = getNowIso();
      return persistStore({
        ...store,
        trips: touchActiveTripTimestamp(store, nowIso),
        day_sheets: store.day_sheets.map((s) =>
          s.id === sheetId
            ? {
                ...s,
                date: dtoRes.data.date,
                note_color: dtoRes.data.note_color,
                day_summary: dtoRes.data.day_summary,
              }
            : s,
        ),
      });
    },

    deleteDaySheet(
      store: StickyPlanStoreV1,
      sheetId: string,
    ): Result<StickyPlanStoreV1> {
      const exists = store.day_sheets.some((s) => s.id === sheetId);
      if (!exists) {
        return {
          ok: false,
          error: {
            code: 'SHEET_NOT_FOUND',
            message: 'Lembar tanggal tidak ditemukan.',
          },
        };
      }

      const nowIso = getNowIso();
      return persistStore({
        ...store,
        trips: touchActiveTripTimestamp(store, nowIso),
        day_sheets: store.day_sheets.filter((s) => s.id !== sheetId),
        itinerary_items: store.itinerary_items.filter(
          (item) => item.day_sheet_id !== sheetId,
        ),
      });
    },

    addActivity(
      store: StickyPlanStoreV1,
      daySheetId: string,
      rawInput: unknown,
    ): Result<{ store: StickyPlanStoreV1; item: ItineraryItemRecord }> {
      const sheetExists = store.day_sheets.some((s) => s.id === daySheetId);
      if (!sheetExists) {
        return {
          ok: false,
          error: {
            code: 'SHEET_NOT_FOUND',
            message: 'Lembar tanggal tujuan tidak ditemukan.',
          },
        };
      }

      const dtoRes = validateActivityInput(rawInput);
      if (!dtoRes.ok) return dtoRes;

      const sheetItems = store.itinerary_items.filter(
        (item) => item.day_sheet_id === daySheetId,
      );
      const nextSortOrder = getNextSortOrderForTime(
        sheetItems,
        dtoRes.data.start_time,
      );
      const nowIso = getNowIso();

      const newItem: ItineraryItemRecord = {
        id: generateId(),
        day_sheet_id: daySheetId,
        start_time: dtoRes.data.start_time,
        title: dtoRes.data.title,
        description: dtoRes.data.description,
        maps_url: dtoRes.data.maps_url,
        sort_order: nextSortOrder,
        created_at: nowIso,
      };

      const persisted = persistStore({
        ...store,
        trips: touchActiveTripTimestamp(store, nowIso),
        itinerary_items: [...store.itinerary_items, newItem],
      });
      if (!persisted.ok) return persisted;

      return { ok: true, data: { store: persisted.data, item: newItem } };
    },

    updateActivity(
      store: StickyPlanStoreV1,
      itemId: string,
      rawInput: unknown,
    ): Result<StickyPlanStoreV1> {
      const existing = store.itinerary_items.find((item) => item.id === itemId);
      if (!existing) {
        return {
          ok: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Kegiatan tidak ditemukan.',
          },
        };
      }

      const dtoRes = validateActivityInput(rawInput);
      if (!dtoRes.ok) return dtoRes;

      const siblingItems = store.itinerary_items.filter(
        (item) =>
          item.day_sheet_id === existing.day_sheet_id && item.id !== itemId,
      );
      const nextSortOrder =
        existing.start_time === dtoRes.data.start_time
          ? existing.sort_order
          : getNextSortOrderForTime(siblingItems, dtoRes.data.start_time);

      const nowIso = getNowIso();
      return persistStore({
        ...store,
        trips: touchActiveTripTimestamp(store, nowIso),
        itinerary_items: store.itinerary_items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                start_time: dtoRes.data.start_time,
                title: dtoRes.data.title,
                description: dtoRes.data.description,
                maps_url: dtoRes.data.maps_url,
                sort_order: nextSortOrder,
              }
            : item,
        ),
      });
    },

    deleteActivity(
      store: StickyPlanStoreV1,
      itemId: string,
    ): Result<StickyPlanStoreV1> {
      const exists = store.itinerary_items.some((item) => item.id === itemId);
      if (!exists) {
        return {
          ok: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Kegiatan tidak ditemukan.',
          },
        };
      }

      const nowIso = getNowIso();
      return persistStore({
        ...store,
        trips: touchActiveTripTimestamp(store, nowIso),
        itinerary_items: store.itinerary_items.filter(
          (item) => item.id !== itemId,
        ),
      });
    },

    markExported(store: StickyPlanStoreV1): Result<StickyPlanStoreV1> {
      return persistStore({
        ...store,
        last_exported_at: getNowIso(),
      });
    },

    importFromJson(
      currentStore: StickyPlanStoreV1,
      jsonText: string,
      byteLength: number,
      mode: ImportMode,
    ): Result<StickyPlanStoreV1> {
      const parsedRes = parseAndValidateImportJson(jsonText, byteLength);
      if (!parsedRes.ok) return parsedRes;

      const imported = parsedRes.data;
      if (mode === 'replace') {
        return persistStore(imported);
      }

      const activeTripId = currentStore.active_trip_id;
      const importedTripId = imported.active_trip_id;
      const importedSheets = imported.day_sheets.filter(
        (s) => s.trip_id === importedTripId,
      );

      const mergedSheets = [...currentStore.day_sheets];
      const sheetByDate = new Map<string, DaySheetRecord>();
      for (const sheet of mergedSheets) {
        if (sheet.trip_id === activeTripId) {
          sheetByDate.set(sheet.date, sheet);
        }
      }

      const importedToTargetSheetId = new Map<string, string>();
      for (const impSheet of importedSheets) {
        const existingSheet = sheetByDate.get(impSheet.date);
        if (existingSheet) {
          importedToTargetSheetId.set(impSheet.id, existingSheet.id);
          if (!existingSheet.day_summary && impSheet.day_summary) {
            const idx = mergedSheets.findIndex((s) => s.id === existingSheet.id);
            if (idx !== -1) {
              mergedSheets[idx] = {
                ...existingSheet,
                day_summary: impSheet.day_summary,
              };
            }
          }
        } else {
          const newSheetId = mergedSheets.some((s) => s.id === impSheet.id)
            ? generateId()
            : impSheet.id;
          const createdSheet: DaySheetRecord = {
            id: newSheetId,
            trip_id: activeTripId,
            date: impSheet.date,
            note_color: impSheet.note_color,
            day_summary: impSheet.day_summary,
          };
          mergedSheets.push(createdSheet);
          sheetByDate.set(impSheet.date, createdSheet);
          importedToTargetSheetId.set(impSheet.id, newSheetId);
        }
      }

      const mergedItems = [...currentStore.itinerary_items];
      const existingItemIds = new Set(mergedItems.map((i) => i.id));

      for (const impItem of imported.itinerary_items) {
        const targetSheetId = importedToTargetSheetId.get(impItem.day_sheet_id);
        if (!targetSheetId) continue;

        const isExactDuplicate = mergedItems.some(
          (item) =>
            item.day_sheet_id === targetSheetId &&
            item.start_time === impItem.start_time &&
            item.title === impItem.title &&
            item.description === impItem.description,
        );
        if (isExactDuplicate) continue;

        const targetSheetItems = mergedItems.filter(
          (item) => item.day_sheet_id === targetSheetId,
        );
        const nextOrder = getNextSortOrderForTime(
          targetSheetItems,
          impItem.start_time,
        );
        const nextId = existingItemIds.has(impItem.id)
          ? generateId()
          : impItem.id;
        existingItemIds.add(nextId);

        mergedItems.push({
          ...impItem,
          id: nextId,
          day_sheet_id: targetSheetId,
          sort_order: nextOrder,
        });
      }

      const candidateStore: StickyPlanStoreV1 = {
        ...currentStore,
        trips: touchActiveTripTimestamp(currentStore, getNowIso()),
        day_sheets: mergedSheets,
        itinerary_items: mergedItems,
      };

      const verified = validateStoreSnapshot(candidateStore);
      if (!verified.ok) return verified;

      return persistStore(verified.data);
    },
  };
}
