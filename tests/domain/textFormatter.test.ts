import { describe, expect, it } from 'vitest';
import { formatTripAsPlainText } from '../../src/domain/textFormatter';
import type { StickyPlanStoreV1 } from '../../src/domain/types';

describe('textFormatter (WhatsApp / Notes backup)', () => {
  it('formats trip days and sorted activities cleanly into readable plain text', () => {
    const store: StickyPlanStoreV1 = {
      schema_version: 1,
      active_trip_id: 'trip-1',
      last_exported_at: null,
      trips: [
        {
          id: 'trip-1',
          title: 'Dinas Bandung',
          schema_version: 1,
          created_at: '2026-11-25T01:00:00.000Z',
          updated_at: '2026-11-25T01:00:00.000Z',
        },
      ],
      day_sheets: [
        {
          id: 's1',
          trip_id: 'trip-1',
          date: '2026-11-25',
          note_color: 'warm-yellow',
          day_summary: 'Hari 1: Keberangkatan',
        },
      ],
      itinerary_items: [
        {
          id: 'i2',
          day_sheet_id: 's1',
          start_time: '10:00',
          title: 'Rapat Evaluasi',
          description: 'Kode Booking: KCJB-889',
          maps_url: 'https://maps.app.goo.gl/GedungSate',
          sort_order: 0,
          created_at: '2026-11-25T01:00:00.000Z',
        },
        {
          id: 'i1',
          day_sheet_id: 's1',
          start_time: '07:30',
          title: 'Kereta Whoosh Halim',
          description: null,
          maps_url: null,
          sort_order: 0,
          created_at: '2026-11-25T01:00:00.000Z',
        },
      ],
    };

    const output = formatTripAsPlainText(store);
    expect(output).toContain('*Dinas Bandung*');
    expect(output).toContain('Rabu, 25 Nov 2026 — Hari 1: Keberangkatan');
    expect(output.indexOf('07:30 - Kereta Whoosh Halim')).toBeLessThan(
      output.indexOf('10:00 - Rapat Evaluasi'),
    );
    expect(output).toContain('Catatan: Kode Booking: KCJB-889');
    expect(output).toContain('Maps: https://maps.app.goo.gl/GedungSate');
  });
});
