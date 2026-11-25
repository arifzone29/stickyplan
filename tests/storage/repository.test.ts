import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLocalStorageRepository,
  type StorageBackend,
} from '../../src/storage/repository';

class MemoryStorage implements StorageBackend {
  private map = new Map<string, string>();
  public failWithQuota = false;

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWithQuota) {
      throw new DOMException('Storage full', 'QuotaExceededError');
    }
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('LocalStorageItineraryRepository (v2.0)', () => {
  let backend: MemoryStorage;

  beforeEach(() => {
    backend = new MemoryStorage();
  });

  it('initializes with Audit Perum LKBN ANTARA Biro Lampung seed schedule', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      storageKey: 'test_v2',
    });

    const boot = repo.loadOrInitialize();
    expect(boot.status).toBe('ready');
    if (boot.status === 'ready') {
      expect(boot.store.trip.title).toBe('Audit Perum LKBN ANTARA Biro Lampung');
      expect(boot.store.day_sheets).toHaveLength(2);
      expect(boot.store.day_sheets[0]?.items).toHaveLength(8);
      expect(boot.store.day_sheets[1]?.items).toHaveLength(11);
    }
  });

  it('auto-upgrades cached 17:00 item-1-8 to Grand Mercure Lampung without wiping other user items', () => {
    const olderCachedJson = JSON.stringify({
      schema_version: 1,
      trip: {
        id: 'trip-audit-antara-lampung-2026',
        title: 'Audit Perum LKBN ANTARA Biro Lampung',
        created_at: '2026-11-25T16:40:00+07:00',
        updated_at: '2026-11-25T16:40:00+07:00',
      },
      day_sheets: [
        {
          id: 'day-2026-11-26',
          date: '2026-11-26',
          note_color: 'warm-yellow',
          day_summary: 'Kedatangan dan Kunjungan ke Mitra',
          items: [
            {
              id: 'custom-user-item',
              start_time: '08:00',
              title: 'Sarapan Pagi',
              description: null,
              maps_url: null,
            },
            {
              id: 'item-1-8',
              start_time: '17:00',
              title: 'Pengantaran ke hotel',
              description:
                '17.00–selesai | Mengantarkan tim Komdigi dan staf ANTARA Pusat menuju hotel untuk beristirahat.',
              maps_url: null,
            },
          ],
        },
      ],
    });
    backend.setItem('test_v2', olderCachedJson);

    const repo = createLocalStorageRepository({
      storage: backend,
      storageKey: 'test_v2',
    });
    const boot = repo.loadOrInitialize();
    expect(boot.status).toBe('ready');
    if (boot.status === 'ready') {
      const items = boot.store.day_sheets[0]!.items;
      expect(items[0]?.title).toBe('Sarapan Pagi');
      expect(items[1]?.title).toBe(
        'Pengantaran ke Hotel Grand Mercure Lampung',
      );
      expect(items[1]?.maps_url).toBe(
        'https://maps.app.goo.gl/n1AaRHHuubSzGed98',
      );
    }
  });

  it('jumps to existing date instead of duplicating, preserves custom reorder on edit, and sorts on sortSheetByTime', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      storageKey: 'test_v2',
    });

    const boot = repo.loadOrInitialize();
    if (boot.status !== 'ready') throw new Error('Expected ready');
    const day1 = boot.store.day_sheets[0]!;

    const dupAttempt = repo.addOrSelectDaySheet(boot.store, {
      date: '2026-11-26',
      note_color: 'warm-yellow',
      day_summary: null,
    });
    expect(dupAttempt.ok).toBe(true);
    if (!dupAttempt.ok) return;
    expect(dupAttempt.data.alreadyExisted).toBe(true);
    expect(dupAttempt.data.sheetId).toBe(day1.id);

    // Move item index 2 (14:00) to index 0 (before 10:30)
    const reordered = repo.reorderActivities(boot.store, day1.id, 2, 0);
    expect(reordered.ok).toBe(true);
    if (!reordered.ok) return;
    const movedId = reordered.data.day_sheets[0]?.items[0]?.id!;
    expect(reordered.data.day_sheets[0]?.items[0]?.start_time).toBe('14:00');

    // Editing moved item keeps its custom slot at index 0
    const edited = repo.updateActivity(reordered.data, day1.id, movedId, {
      start_time: '14:15',
      title: 'Makan siang bersama (Diundur)',
      description: 'Di Mbok Wito',
      maps_url: 'Mbok Wito Lampung',
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.data.day_sheets[0]?.items[0]?.id).toBe(movedId);

    // Clicking "Urutkan Jam" restores chronological order
    const sorted = repo.sortSheetByTime(edited.data, day1.id);
    expect(sorted.ok).toBe(true);
    if (!sorted.ok) return;
    expect(sorted.data.day_sheets[0]?.items[0]?.start_time).toBe('10:30');
  });

  it('adds bulk activities from Word/Excel/WA paste and auto-sorts chronologically', () => {
    const repo = createLocalStorageRepository({
      storage: backend,
      storageKey: 'test_v2',
    });
    const boot = repo.loadOrInitialize();
    if (boot.status !== 'ready') throw new Error('Expected ready');

    const newDay = repo.addOrSelectDaySheet(boot.store, {
      date: '2026-11-28',
      note_color: 'soft-blue',
      day_summary: 'Kepulangan ke Jakarta',
    });
    if (!newDay.ok) throw new Error('Expected ok');

    const bulkRes = repo.addBulkActivities(
      newDay.data.store,
      newDay.data.sheetId,
      '11:00 Boarding pesawat\n08.30–09.30\tCheck-out hotel\tMenuju bandara\tBandara Radin Inten II',
    );
    expect(bulkRes.ok).toBe(true);
    if (!bulkRes.ok) return;
    expect(bulkRes.data.addedCount).toBe(2);

    const sheet28 = bulkRes.data.store.day_sheets.find(
      (s) => s.id === newDay.data.sheetId,
    )!;
    expect(sheet28.items.map((i) => i.start_time)).toEqual(['08:30', '11:00']);
  });

  it('quarantines corrupt storage into Safe Mode and handles QuotaExceededError', () => {
    backend.setItem('test_v2', '{broken-json');
    const repo = createLocalStorageRepository({
      storage: backend,
      storageKey: 'test_v2',
    });

    const boot = repo.loadOrInitialize();
    expect(boot.status).toBe('corrupt');

    const reset = repo.resetToDefaultSeed();
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;

    backend.failWithQuota = true;
    const quotaFail = repo.updateTripTitle(reset.data, 'Gagal Simpan');
    expect(quotaFail.ok).toBe(false);
    if (!quotaFail.ok) {
      expect(quotaFail.error.code).toBe('QUOTA_EXCEEDED');
    }
  });
});
