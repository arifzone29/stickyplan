import { describe, expect, it } from 'vitest';
import { createLampungDefaultStore } from '../../src/domain/seedData';
import { validateStoreSnapshot } from '../../src/domain/validators';

describe('Lampung default rundown seed data', () => {
  it('provides complete 2-day Audit Perum LKBN ANTARA Biro Lampung schedule (26-27 Nov 2026) passing strict schema validation', () => {
    const store = createLampungDefaultStore();
    const validation = validateStoreSnapshot(store);

    expect(validation.ok).toBe(true);
    expect(store.trip.title).toBe('Audit Perum LKBN ANTARA Biro Lampung');
    expect(store.day_sheets).toHaveLength(2);

    const day1 = store.day_sheets[0]!;
    expect(day1.date).toBe('2026-11-26');
    expect(day1.note_color).toBe('warm-yellow');
    expect(day1.day_summary).toBe('Kedatangan dan Kunjungan ke Mitra');
    expect(day1.items).toHaveLength(8);
    expect(day1.items[0]?.start_time).toBe('10:30');
    expect(day1.items[0]?.title).toBe('Penjemputan rombongan');
    expect(day1.items[7]?.start_time).toBe('17:00');
    expect(day1.items[7]?.title).toBe(
      'Pengantaran ke Hotel Grand Mercure Lampung',
    );
    expect(day1.items[7]?.description).toContain('Grand Mercure Lampung');
    expect(day1.items[7]?.maps_url).toBe(
      'https://maps.app.goo.gl/n1AaRHHuubSzGed98',
    );

    const day2 = store.day_sheets[1]!;
    expect(day2.date).toBe('2026-11-27');
    expect(day2.note_color).toBe('mint');
    expect(day2.day_summary).toBe('Lanjutan Kunjungan ke Mitra');
    expect(day2.items).toHaveLength(11);
    expect(day2.items[3]?.title).toBe("Sholat Jum'at");
    expect(day2.items[10]?.title).toBe('Makan malam bersama');
  });
});
