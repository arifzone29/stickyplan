import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStorageRepository, type StorageBackend } from '../../src/storage/repository';

class MemoryStorage implements StorageBackend {
  private map = new Map<string, string>();
  public failWithQuota = false;

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWithQuota) {
      const err = new DOMException('Storage full', 'QuotaExceededError');
      throw err;
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('LocalStorageItineraryRepository', () => {
  let backend: MemoryStorage;

  beforeEach(() => {
    backend = new MemoryStorage();
  });

  it('initializes first-time user with default trip and today local day sheet', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      namespace: 'test_sp',
      getTodayLocal: () => '2026-11-25',
    });

    const boot = repo.loadOrInitialize();
    expect(boot.status).toBe('ready');
    if (boot.status === 'ready') {
      expect(boot.store.trips).toHaveLength(1);
      expect(boot.store.trips[0]?.title).toBe('Itinerary Saya');
      expect(boot.store.day_sheets).toHaveLength(1);
      expect(boot.store.day_sheets[0]?.date).toBe('2026-11-25');
    }
  });

  it('performs CRUD on trip title, day sheets (preventing duplicate dates & cascading item delete), and activities', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      namespace: 'test_sp',
      getTodayLocal: () => '2026-11-25',
    });

    const boot = repo.loadOrInitialize();
    if (boot.status !== 'ready') throw new Error('Expected ready');
    const sheet25 = boot.store.day_sheets[0]!;

    const renameRes = repo.updateTripTitle(boot.store, 'Dinas Surabaya');
    expect(renameRes.ok).toBe(true);
    if (!renameRes.ok) return;
    expect(renameRes.data.trips[0]?.title).toBe('Dinas Surabaya');

    const dupSheet = repo.addDaySheet(renameRes.data, {
      date: '2026-11-25',
      note_color: 'warm-yellow',
      day_summary: null,
    });
    expect(dupSheet.ok).toBe(false);

    const addSheet27 = repo.addDaySheet(renameRes.data, {
      date: '2026-11-27',
      note_color: 'sage-mint',
      day_summary: 'Kepulangan',
    });
    expect(addSheet27.ok).toBe(true);
    if (!addSheet27.ok) return;

    const item1 = repo.addActivity(addSheet27.data, sheet25.id, {
      start_time: '12:00',
      title: 'Makan Siang',
      description: null,
      maps_url: null,
    });
    expect(item1.ok).toBe(true);
    if (!item1.ok) return;

    const item2 = repo.addActivity(item1.data.store, sheet25.id, {
      start_time: '12:00',
      title: 'Kopi Singkat',
      description: 'Meja reservasi Raka',
      maps_url: 'https://maps.app.goo.gl/KopiSby',
    });
    expect(item2.ok).toBe(true);
    if (!item2.ok) return;
    expect(item2.data.item.sort_order).toBe(1);

    const updated = repo.updateActivity(
      item2.data.store,
      item1.data.item.id,
      {
        start_time: '11:30',
        title: 'Makan Siang Awal',
        description: null,
        maps_url: null,
      },
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(
      updated.data.itinerary_items.find((i) => i.id === item1.data.item.id)
        ?.start_time,
    ).toBe('11:30');

    const afterDeleteSheet = repo.deleteDaySheet(updated.data, sheet25.id);
    expect(afterDeleteSheet.ok).toBe(true);
    if (!afterDeleteSheet.ok) return;
    expect(
      afterDeleteSheet.data.itinerary_items.filter(
        (i) => i.day_sheet_id === sheet25.id,
      ),
    ).toHaveLength(0);
  });

  it('quarantines corrupted JSON into Safe Mode without crashing and supports resetSafeMode', () => {
    backend.setItem('test_sp:store', '{broken-json-payload');

    const repo = createLocalStorageRepository({
      storage: backend,
      namespace: 'test_sp',
      getTodayLocal: () => '2026-11-25',
    });

    const boot = repo.loadOrInitialize();
    expect(boot.status).toBe('corrupt');
    if (boot.status === 'corrupt') {
      expect(boot.rawSnapshot).toBe('{broken-json-payload');
      expect(backend.getItem('test_sp:corrupt_backup')).toBe(
        '{broken-json-payload',
      );
    }

    const recovered = repo.resetSafeMode();
    expect(recovered.ok).toBe(true);
    if (recovered.ok) {
      expect(recovered.data.day_sheets[0]?.date).toBe('2026-11-25');
    }
  });

  it('catches QuotaExceededError cleanly on write and returns explicit QUOTA_EXCEEDED error', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      namespace: 'test_sp',
      getTodayLocal: () => '2026-11-25',
    });

    const boot = repo.loadOrInitialize();
    if (boot.status !== 'ready') throw new Error('Expected ready');

    backend.failWithQuota = true;
    const res = repo.updateTripTitle(boot.store, 'Judul Baru Saat Penuh');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('QUOTA_EXCEEDED');
    }
  });

  it('supports Replace and Merge JSON import modes while preserving existing schedules on Merge', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      namespace: 'test_sp',
      getTodayLocal: () => '2026-11-25',
    });

    const boot = repo.loadOrInitialize();
    if (boot.status !== 'ready') throw new Error('Expected ready');
    const localSheet = boot.store.day_sheets[0]!;
    const withLocalItem = repo.addActivity(boot.store, localSheet.id, {
      start_time: '08:00',
      title: 'Agenda Lokal Pagi',
      description: null,
      maps_url: null,
    });
    if (!withLocalItem.ok) throw new Error('Expected ok');

    const importedJson = JSON.stringify({
      schema_version: 1,
      active_trip_id: 'imp-trip',
      last_exported_at: null,
      trips: [
        {
          id: 'imp-trip',
          title: 'Trip Impor',
          schema_version: 1,
          created_at: '2026-11-25T01:00:00.000Z',
          updated_at: '2026-11-25T01:00:00.000Z',
        },
      ],
      day_sheets: [
        {
          id: 'imp-s1',
          trip_id: 'imp-trip',
          date: '2026-11-25',
          note_color: 'warm-yellow',
          day_summary: 'Gabungan Hari 1',
        },
        {
          id: 'imp-s2',
          trip_id: 'imp-trip',
          date: '2026-11-28',
          note_color: 'sky-pale',
          day_summary: 'Hari Tambahan',
        },
      ],
      itinerary_items: [
        {
          id: 'imp-i1',
          day_sheet_id: 'imp-s1',
          start_time: '15:00',
          title: 'Agenda Impor Sore',
          description: null,
          maps_url: null,
          sort_order: 0,
          created_at: '2026-11-25T01:00:00.000Z',
        },
        {
          id: 'imp-i2',
          day_sheet_id: 'imp-s2',
          start_time: '09:00',
          title: 'Agenda Tanggal 28',
          description: null,
          maps_url: null,
          sort_order: 0,
          created_at: '2026-11-25T01:00:00.000Z',
        },
      ],
    });

    const merged = repo.importFromJson(
      withLocalItem.data.store,
      importedJson,
      importedJson.length,
      'merge',
    );
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.data.day_sheets).toHaveLength(2);
    expect(merged.data.itinerary_items.map((i) => i.title)).toEqual(
      expect.arrayContaining([
        'Agenda Lokal Pagi',
        'Agenda Impor Sore',
        'Agenda Tanggal 28',
      ]),
    );

    const replaced = repo.importFromJson(
      merged.data,
      importedJson,
      importedJson.length,
      'replace',
    );
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(replaced.data.trips[0]?.title).toBe('Trip Impor');
    expect(replaced.data.itinerary_items).toHaveLength(2);
  });
});
