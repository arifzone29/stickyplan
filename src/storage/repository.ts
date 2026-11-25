import { parseBulkInputText } from '../domain/bulkParser';
import { createLampungDefaultStore } from '../domain/seedData';
import {
  reorderArrayItem,
  sortDaySheets,
  sortItineraryItems,
} from '../domain/sorting';
import {
  DEFAULT_STORAGE_KEY,
  type DaySheet,
  type ImportMode,
  type ItineraryItem,
  type NoteColor,
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
  resetToDefaultSeed(): Result<StickyPlanStoreV1>;
  updateTripTitle(
    store: StickyPlanStoreV1,
    rawTitle: unknown,
  ): Result<StickyPlanStoreV1>;
  addOrSelectDaySheet(
    store: StickyPlanStoreV1,
    rawInput: unknown,
  ): Result<{
    store: StickyPlanStoreV1;
    sheetId: string;
    alreadyExisted: boolean;
  }>;
  updateDaySheetMeta(
    store: StickyPlanStoreV1,
    sheetId: string,
    patch: { note_color?: NoteColor; day_summary?: string | null },
  ): Result<StickyPlanStoreV1>;
  deleteDaySheet(
    store: StickyPlanStoreV1,
    sheetId: string,
  ): Result<StickyPlanStoreV1>;
  addActivity(
    store: StickyPlanStoreV1,
    daySheetId: string,
    rawInput: unknown,
  ): Result<{ store: StickyPlanStoreV1; item: ItineraryItem }>;
  addBulkActivities(
    store: StickyPlanStoreV1,
    daySheetId: string,
    rawBulkText: string,
  ): Result<{ store: StickyPlanStoreV1; addedCount: number }>;
  updateActivity(
    store: StickyPlanStoreV1,
    daySheetId: string,
    itemId: string,
    rawInput: unknown,
  ): Result<StickyPlanStoreV1>;
  deleteActivity(
    store: StickyPlanStoreV1,
    daySheetId: string,
    itemId: string,
  ): Result<StickyPlanStoreV1>;
  reorderActivities(
    store: StickyPlanStoreV1,
    daySheetId: string,
    fromIndex: number,
    toIndex: number,
  ): Result<StickyPlanStoreV1>;
  sortSheetByTime(
    store: StickyPlanStoreV1,
    daySheetId: string,
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
  storageKey?: string;
  createSeedStore?: () => StickyPlanStoreV1;
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
  const storeKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const corruptBackupKey = `${storeKey}:corrupt_backup`;
  const buildSeed = options.createSeedStore ?? createLampungDefaultStore;
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const getNowIso = options.getNowIso ?? (() => new Date().toISOString());

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
              'Penyimpanan browser penuh. Segera klik Export JSON agar jadwal tetap aman.',
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'STORAGE_WRITE_FAILED',
          message: 'Gagal menyimpan perubahan ke penyimpanan lokal perangkat.',
        },
      };
    }
  }

  function withUpdatedTripTime(
    store: StickyPlanStoreV1,
    patch: Partial<StickyPlanStoreV1>,
  ): StickyPlanStoreV1 {
    return {
      ...store,
      ...patch,
      trip: {
        ...store.trip,
        ...(patch.trip ?? {}),
        updated_at: getNowIso(),
      },
    };
  }

  return {
    loadOrInitialize(): BootState {
      let raw: string | null = null;
      try {
        raw = storage.getItem(storeKey);
      } catch {
        return { status: 'ready', store: buildSeed() };
      }

      if (raw === null) {
        // Check if legacy v1 key has non-empty user items to preserve
        try {
          const legacyRaw = storage.getItem('stickyplan_v1:store');
          if (legacyRaw) {
            const migrated = parseAndValidateImportJson(
              legacyRaw,
              legacyRaw.length,
            );
            if (
              migrated.ok &&
              migrated.data.day_sheets.some((s) => s.items.length > 0)
            ) {
              persistStore(migrated.data);
              return { status: 'ready', store: migrated.data };
            }
          }
        } catch {
          // Ignore legacy check errors and use clean default seed
        }

        const seed = buildSeed();
        persistStore(seed);
        return { status: 'ready', store: seed };
      }

      const validated = parseAndValidateImportJson(raw, raw.length);
      if (!validated.ok) {
        try {
          storage.setItem(corruptBackupKey, raw);
        } catch {
          // Best-effort quarantine
        }
        return {
          status: 'corrupt',
          rawSnapshot: raw,
          reason: validated.error.message,
        };
      }

      return { status: 'ready', store: validated.data };
    },

    resetToDefaultSeed(): Result<StickyPlanStoreV1> {
      return persistStore(buildSeed());
    },

    updateTripTitle(
      store: StickyPlanStoreV1,
      rawTitle: unknown,
    ): Result<StickyPlanStoreV1> {
      const titleRes = validateTripTitle(rawTitle);
      if (!titleRes.ok) return titleRes;

      return persistStore(
        withUpdatedTripTime(store, {
          trip: {
            ...store.trip,
            title: titleRes.data,
            updated_at: getNowIso(),
          },
        }),
      );
    },

    addOrSelectDaySheet(
      store: StickyPlanStoreV1,
      rawInput: unknown,
    ): Result<{
      store: StickyPlanStoreV1;
      sheetId: string;
      alreadyExisted: boolean;
    }> {
      const dtoRes = validateDaySheetInput(rawInput);
      if (!dtoRes.ok) return dtoRes;

      const existing = store.day_sheets.find(
        (sheet) => sheet.date === dtoRes.data.date,
      );
      if (existing) {
        return {
          ok: true,
          data: {
            store,
            sheetId: existing.id,
            alreadyExisted: true,
          },
        };
      }

      const newSheet: DaySheet = {
        id: generateId(),
        date: dtoRes.data.date,
        note_color: dtoRes.data.note_color,
        day_summary: dtoRes.data.day_summary,
        items: [],
      };

      const persisted = persistStore(
        withUpdatedTripTime(store, {
          day_sheets: sortDaySheets([...store.day_sheets, newSheet]),
        }),
      );
      if (!persisted.ok) return persisted;

      return {
        ok: true,
        data: {
          store: persisted.data,
          sheetId: newSheet.id,
          alreadyExisted: false,
        },
      };
    },

    updateDaySheetMeta(
      store: StickyPlanStoreV1,
      sheetId: string,
      patch: { note_color?: NoteColor; day_summary?: string | null },
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

      const dtoRes = validateDaySheetInput({
        date: target.date,
        note_color: patch.note_color ?? target.note_color,
        day_summary:
          patch.day_summary !== undefined
            ? patch.day_summary
            : target.day_summary,
      });
      if (!dtoRes.ok) return dtoRes;

      return persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === sheetId
              ? {
                  ...s,
                  note_color: dtoRes.data.note_color,
                  day_summary: dtoRes.data.day_summary,
                }
              : s,
          ),
        }),
      );
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

      return persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.filter((s) => s.id !== sheetId),
        }),
      );
    },

    addActivity(
      store: StickyPlanStoreV1,
      daySheetId: string,
      rawInput: unknown,
    ): Result<{ store: StickyPlanStoreV1; item: ItineraryItem }> {
      const sheet = store.day_sheets.find((s) => s.id === daySheetId);
      if (!sheet) {
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

      const newItem: ItineraryItem = {
        id: generateId(),
        start_time: dtoRes.data.start_time,
        title: dtoRes.data.title,
        description: dtoRes.data.description,
        maps_url: dtoRes.data.maps_url,
      };

      const persisted = persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === daySheetId
              ? { ...s, items: sortItineraryItems([...s.items, newItem]) }
              : s,
          ),
        }),
      );
      if (!persisted.ok) return persisted;

      return { ok: true, data: { store: persisted.data, item: newItem } };
    },

    addBulkActivities(
      store: StickyPlanStoreV1,
      daySheetId: string,
      rawBulkText: string,
    ): Result<{ store: StickyPlanStoreV1; addedCount: number }> {
      const sheet = store.day_sheets.find((s) => s.id === daySheetId);
      if (!sheet) {
        return {
          ok: false,
          error: {
            code: 'SHEET_NOT_FOUND',
            message: 'Lembar tanggal tujuan tidak ditemukan.',
          },
        };
      }

      const parsedDtos = parseBulkInputText(rawBulkText);
      if (parsedDtos.length === 0) {
        return {
          ok: false,
          error: {
            code: 'EMPTY_BULK_INPUT',
            message: 'Tidak ada baris kegiatan valid yang terdeteksi.',
          },
        };
      }

      const createdItems: ItineraryItem[] = parsedDtos.map((dto) => ({
        id: generateId(),
        start_time: dto.start_time,
        title: dto.title,
        description: dto.description,
        maps_url: dto.maps_url,
      }));

      const persisted = persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === daySheetId
              ? {
                  ...s,
                  items: sortItineraryItems([...s.items, ...createdItems]),
                }
              : s,
          ),
        }),
      );
      if (!persisted.ok) return persisted;

      return {
        ok: true,
        data: { store: persisted.data, addedCount: createdItems.length },
      };
    },

    updateActivity(
      store: StickyPlanStoreV1,
      daySheetId: string,
      itemId: string,
      rawInput: unknown,
    ): Result<StickyPlanStoreV1> {
      const sheet = store.day_sheets.find((s) => s.id === daySheetId);
      if (!sheet || !sheet.items.some((i) => i.id === itemId)) {
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

      // Per PRD v2.0 F3: editing an item preserves its custom position until "Urutkan Jam" is clicked
      return persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === daySheetId
              ? {
                  ...s,
                  items: s.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          start_time: dtoRes.data.start_time,
                          title: dtoRes.data.title,
                          description: dtoRes.data.description,
                          maps_url: dtoRes.data.maps_url,
                        }
                      : item,
                  ),
                }
              : s,
          ),
        }),
      );
    },

    deleteActivity(
      store: StickyPlanStoreV1,
      daySheetId: string,
      itemId: string,
    ): Result<StickyPlanStoreV1> {
      const sheet = store.day_sheets.find((s) => s.id === daySheetId);
      if (!sheet || !sheet.items.some((i) => i.id === itemId)) {
        return {
          ok: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Kegiatan tidak ditemukan.',
          },
        };
      }

      return persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === daySheetId
              ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
              : s,
          ),
        }),
      );
    },

    reorderActivities(
      store: StickyPlanStoreV1,
      daySheetId: string,
      fromIndex: number,
      toIndex: number,
    ): Result<StickyPlanStoreV1> {
      const sheet = store.day_sheets.find((s) => s.id === daySheetId);
      if (!sheet) {
        return {
          ok: false,
          error: {
            code: 'SHEET_NOT_FOUND',
            message: 'Lembar tanggal tidak ditemukan.',
          },
        };
      }

      return persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === daySheetId
              ? {
                  ...s,
                  items: reorderArrayItem(s.items, fromIndex, toIndex),
                }
              : s,
          ),
        }),
      );
    },

    sortSheetByTime(
      store: StickyPlanStoreV1,
      daySheetId: string,
    ): Result<StickyPlanStoreV1> {
      const sheet = store.day_sheets.find((s) => s.id === daySheetId);
      if (!sheet) {
        return {
          ok: false,
          error: {
            code: 'SHEET_NOT_FOUND',
            message: 'Lembar tanggal tidak ditemukan.',
          },
        };
      }

      return persistStore(
        withUpdatedTripTime(store, {
          day_sheets: store.day_sheets.map((s) =>
            s.id === daySheetId
              ? { ...s, items: sortItineraryItems(s.items) }
              : s,
          ),
        }),
      );
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

      const mergedByDate = new Map<string, DaySheet>();
      const existingItemIds = new Set<string>();

      for (const sheet of currentStore.day_sheets) {
        for (const item of sheet.items) {
          existingItemIds.add(item.id);
        }
        mergedByDate.set(sheet.date, {
          ...sheet,
          items: [...sheet.items],
        });
      }

      for (const impSheet of imported.day_sheets) {
        const target = mergedByDate.get(impSheet.date);
        if (!target) {
          const remappedItems = impSheet.items.map((it) => {
            const id = existingItemIds.has(it.id) ? generateId() : it.id;
            existingItemIds.add(id);
            return { ...it, id };
          });
          mergedByDate.set(impSheet.date, {
            id: mergedByDate.size > 0 ? generateId() : impSheet.id,
            date: impSheet.date,
            note_color: impSheet.note_color,
            day_summary: impSheet.day_summary,
            items: remappedItems,
          });
          continue;
        }

        if (!target.day_summary && impSheet.day_summary) {
          target.day_summary = impSheet.day_summary;
        }

        for (const impItem of impSheet.items) {
          const isDuplicate = target.items.some(
            (existing) =>
              existing.start_time === impItem.start_time &&
              existing.title === impItem.title &&
              existing.description === impItem.description,
          );
          if (isDuplicate) continue;

          const id = existingItemIds.has(impItem.id)
            ? generateId()
            : impItem.id;
          existingItemIds.add(id);
          target.items.push({ ...impItem, id });
        }
        target.items = sortItineraryItems(target.items);
      }

      const candidate: StickyPlanStoreV1 = withUpdatedTripTime(currentStore, {
        day_sheets: sortDaySheets([...mergedByDate.values()]),
      });

      const verified = validateStoreSnapshot(candidate);
      if (!verified.ok) return verified;

      return persistStore(verified.data);
    },
  };
}
