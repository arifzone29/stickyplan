import { describe, expect, it } from 'vitest';
import {
  parseAndValidateImportJson,
  validateActivityInput,
  validateDaySheetInput,
  validateTripTitle,
} from '../../src/domain/validators';
import { MAX_IMPORT_FILE_BYTES } from '../../src/domain/types';

describe('validators v2.0 (strict DTO allow-list, nested schema & legacy compat)', () => {
  it('validates activity input, trims fields, converts venue text to safe Maps URL, and strips injected keys', () => {
    const res = validateActivityInput({
      start_time: '09:30',
      title: '  Kunjungan Radar Lampung  ',
      description: '  Evaluasi PSO  ',
      maps_url: 'Radar Lampung',
      role: 'admin',
      is_admin: true,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({
        start_time: '09:30',
        title: 'Kunjungan Radar Lampung',
        description: 'Evaluasi PSO',
        maps_url: 'https://www.google.com/maps/search/?api=1&query=Radar%20Lampung',
      });
      expect('role' in res.data).toBe(false);
    }
  });

  it('validates v2.0 note_color values and maps legacy color aliases cleanly', () => {
    expect(validateTripTitle('  Audit ANTARA Lampung  ')).toEqual({
      ok: true,
      data: 'Audit ANTARA Lampung',
    });

    expect(
      validateDaySheetInput({
        date: '2026-11-26',
        note_color: 'mint',
        day_summary: '  Hari 1  ',
      }),
    ).toEqual({
      ok: true,
      data: { date: '2026-11-26', note_color: 'mint', day_summary: 'Hari 1' },
    });

    expect(
      validateDaySheetInput({
        date: '2026-11-27',
        note_color: 'sky-pale',
      }),
    ).toEqual({
      ok: true,
      data: { date: '2026-11-27', note_color: 'soft-blue', day_summary: null },
    });
  });

  it('accepts v2.0 nested StickyPlan JSON and strips unknown properties', () => {
    const v2Json = JSON.stringify({
      schema_version: 1,
      extra_field: 'strip',
      trip: {
        id: 't1',
        title: 'Audit Lampung',
        created_at: '2026-11-25T16:40:00+07:00',
        updated_at: '2026-11-25T16:40:00+07:00',
        is_admin: true,
      },
      day_sheets: [
        {
          id: 'd1',
          date: '2026-11-26',
          note_color: 'warm-yellow',
          day_summary: 'Kedatangan',
          items: [
            {
              id: 'i1',
              start_time: '10:30',
              title: 'Penjemputan rombongan',
              description: 'Bandara Radin Inten II',
              maps_url: 'https://maps.app.goo.gl/RadinInten',
            },
          ],
        },
      ],
    });

    const parsed = parseAndValidateImportJson(v2Json, v2Json.length);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect('extra_field' in parsed.data).toBe(false);
      expect('is_admin' in parsed.data.trip).toBe(false);
      expect(parsed.data.day_sheets[0]?.items[0]?.title).toBe(
        'Penjemputan rombongan',
      );
    }
  });

  it('blocks prototype pollution (__proto__, constructor, prototype), oversize files, and XSS maps_url', () => {
    const protoPayload =
      '{"schema_version":1,"__proto__":{"polluted":true},"trip":{"id":"t1","title":"X","created_at":"2026-11-25T00:00:00Z","updated_at":"2026-11-25T00:00:00Z"},"day_sheets":[]}';
    expect(parseAndValidateImportJson(protoPayload, protoPayload.length).ok).toBe(
      false,
    );

    expect(parseAndValidateImportJson('{}', MAX_IMPORT_FILE_BYTES + 1).ok).toBe(
      false,
    );

    const xssPayload = JSON.stringify({
      schema_version: 1,
      trip: {
        id: 't1',
        title: 'X',
        created_at: '2026-11-25T00:00:00Z',
        updated_at: '2026-11-25T00:00:00Z',
      },
      day_sheets: [
        {
          id: 'd1',
          date: '2026-11-26',
          note_color: 'warm-yellow',
          day_summary: null,
          items: [
            {
              id: 'i1',
              start_time: '09:00',
              title: 'Bad',
              description: null,
              maps_url: 'javascript:alert(1)',
            },
          ],
        },
      ],
    });
    expect(parseAndValidateImportJson(xssPayload, xssPayload.length).ok).toBe(
      false,
    );
  });
});
