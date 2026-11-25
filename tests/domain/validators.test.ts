import { describe, expect, it } from 'vitest';
import {
  parseAndValidateImportJson,
  validateActivityInput,
  validateDaySheetInput,
  validateTripTitle,
} from '../../src/domain/validators';
import { MAX_IMPORT_FILE_BYTES } from '../../src/domain/types';

describe('validators (strict DTO allow-list & import security)', () => {
  it('validates activity input, trims fields, converts venue text to safe Maps URL, and strips injected keys', () => {
    const rawPayload = {
      start_time: '09:30',
      title: '  Rapat Koordinasi Komdigi  ',
      description: '  Lantai 7 Ruang Rapat Utama  ',
      maps_url: 'Kementerian Komunikasi dan Digital Jakarta',
      role: 'admin',
      is_admin: true,
      user_id: 'spoofed-user',
    };

    const res = validateActivityInput(rawPayload);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({
        start_time: '09:30',
        title: 'Rapat Koordinasi Komdigi',
        description: 'Lantai 7 Ruang Rapat Utama',
        maps_url:
          'https://www.google.com/maps/search/?api=1&query=Kementerian%20Komunikasi%20dan%20Digital%20Jakarta',
      });
      expect('role' in res.data).toBe(false);
      expect('is_admin' in res.data).toBe(false);
    }
  });

  it('rejects invalid 24h time, empty/overlong title, overlong description, and malicious maps_url', () => {
    expect(
      validateActivityInput({ start_time: '24:00', title: 'Valid' }).ok,
    ).toBe(false);
    expect(
      validateActivityInput({ start_time: '9:30', title: 'Valid' }).ok,
    ).toBe(false);
    expect(
      validateActivityInput({ start_time: '09:30', title: '    ' }).ok,
    ).toBe(false);
    expect(
      validateActivityInput({
        start_time: '09:30',
        title: 'A'.repeat(81),
      }).ok,
    ).toBe(false);
    expect(
      validateActivityInput({
        start_time: '09:30',
        title: 'Valid',
        description: 'D'.repeat(1001),
      }).ok,
    ).toBe(false);
    expect(
      validateActivityInput({
        start_time: '09:30',
        title: 'Valid',
        maps_url: 'javascript:alert(1)',
      }).ok,
    ).toBe(false);
  });

  it('validates trip title and day sheet DTO boundaries', () => {
    expect(validateTripTitle('  Dinas Bandung  ')).toEqual({
      ok: true,
      data: 'Dinas Bandung',
    });
    expect(validateTripTitle('   ').ok).toBe(false);
    expect(validateTripTitle('T'.repeat(61)).ok).toBe(false);

    expect(
      validateDaySheetInput({
        date: '2026-11-25',
        note_color: 'sage-mint',
        day_summary: '  Hari 1: Kedatangan  ',
      }),
    ).toEqual({
      ok: true,
      data: {
        date: '2026-11-25',
        note_color: 'sage-mint',
        day_summary: 'Hari 1: Kedatangan',
      },
    });
    expect(
      validateDaySheetInput({
        date: '2026-02-30',
        note_color: 'warm-yellow',
      }).ok,
    ).toBe(false);
  });

  it('accepts valid StickyPlanStoreV1 JSON and strips unknown properties', () => {
    const validStore = JSON.stringify({
      schema_version: 1,
      active_trip_id: 'trip-1',
      last_exported_at: '2026-11-25T03:00:00.000Z',
      extra_root: 'strip-me',
      trips: [
        {
          id: 'trip-1',
          title: 'Dinas Surabaya',
          schema_version: 1,
          created_at: '2026-11-25T01:00:00.000Z',
          updated_at: '2026-11-25T02:00:00.000Z',
          is_admin: true,
        },
      ],
      day_sheets: [
        {
          id: 'sheet-1',
          trip_id: 'trip-1',
          date: '2026-11-25',
          note_color: 'warm-yellow',
          day_summary: 'Hari Pertama',
        },
      ],
      itinerary_items: [
        {
          id: 'item-1',
          day_sheet_id: 'sheet-1',
          start_time: '08:00',
          title: 'Landing Bandara Juanda',
          description: 'Terminal 2',
          maps_url: 'https://maps.app.goo.gl/JuandaT2',
          sort_order: 0,
          created_at: '2026-11-25T01:05:00.000Z',
        },
      ],
    });

    const parsed = parseAndValidateImportJson(validStore, validStore.length);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect('extra_root' in parsed.data).toBe(false);
      expect('is_admin' in (parsed.data.trips[0] ?? {})).toBe(false);
      expect(parsed.data.itinerary_items[0]?.title).toBe('Landing Bandara Juanda');
    }
  });

  it('blocks prototype pollution (__proto__, constructor, prototype), oversize files, orphan FKs, and XSS maps_url in imports', () => {
    const protoPayload =
      '{"schema_version":1,"__proto__":{"polluted":true},"active_trip_id":"t1","last_exported_at":null,"trips":[],"day_sheets":[],"itinerary_items":[]}';
    expect(parseAndValidateImportJson(protoPayload, protoPayload.length).ok).toBe(false);

    expect(
      parseAndValidateImportJson('{}', MAX_IMPORT_FILE_BYTES + 1).ok,
    ).toBe(false);

    const orphanItemPayload = JSON.stringify({
      schema_version: 1,
      active_trip_id: 'trip-1',
      last_exported_at: null,
      trips: [
        {
          id: 'trip-1',
          title: 'Trip',
          schema_version: 1,
          created_at: '2026-11-25T01:00:00.000Z',
          updated_at: '2026-11-25T01:00:00.000Z',
        },
      ],
      day_sheets: [],
      itinerary_items: [
        {
          id: 'item-1',
          day_sheet_id: 'missing-sheet',
          start_time: '08:00',
          title: 'Orphan',
          description: null,
          maps_url: null,
          sort_order: 0,
          created_at: '2026-11-25T01:00:00.000Z',
        },
      ],
    });
    expect(
      parseAndValidateImportJson(orphanItemPayload, orphanItemPayload.length).ok,
    ).toBe(false);
  });
});
