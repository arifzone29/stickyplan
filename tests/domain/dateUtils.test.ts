import { describe, expect, it } from 'vitest';
import {
  formatDateHeaderId,
  formatDatePillId,
  getLocalDateString,
  isValidCalendarDate,
  resolveInitialDaySheetId,
} from '../../src/domain/dateUtils';
import type { DaySheetRecord } from '../../src/domain/types';

function makeSheet(id: string, date: string): DaySheetRecord {
  return {
    id,
    trip_id: 'trip-1',
    date,
    note_color: 'warm-yellow',
    day_summary: null,
  };
}

describe('dateUtils', () => {
  it('computes local YYYY-MM-DD without UTC day-shift at 00:30 early morning', () => {
    const earlyMorningLocal = new Date(2026, 10, 25, 0, 30, 0);
    expect(getLocalDateString(earlyMorningLocal)).toBe('2026-11-25');

    const singleDigitLocal = new Date(2026, 0, 5, 6, 15, 0);
    expect(getLocalDateString(singleDigitLocal)).toBe('2026-01-05');
  });

  it('validates real calendar dates including leap years and rejects impossible dates', () => {
    expect(isValidCalendarDate('2026-11-25')).toBe(true);
    expect(isValidCalendarDate('2028-02-29')).toBe(true);

    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('2026-02-31')).toBe(false);
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('2026-00-10')).toBe(false);
    expect(isValidCalendarDate('25-11-2026')).toBe(false);
    expect(isValidCalendarDate('   ')).toBe(false);
  });

  it('formats Indonesian full header and compact pill labels accurately', () => {
    expect(formatDateHeaderId('2026-11-25')).toBe('Rabu, 25 Nov 2026');
    expect(formatDatePillId('2026-11-25')).toBe('Rab, 25 Nov');
  });

  it('resolves initial day sheet: exact today match, upcoming gap date, pre-trip, post-trip, and empty', () => {
    const sheets = [
      makeSheet('sheet-27', '2026-11-27'),
      makeSheet('sheet-25', '2026-11-25'),
      makeSheet('sheet-29', '2026-11-29'),
    ];

    expect(resolveInitialDaySheetId(sheets, '2026-11-27')).toBe('sheet-27');
    expect(resolveInitialDaySheetId(sheets, '2026-11-26')).toBe('sheet-27');
    expect(resolveInitialDaySheetId(sheets, '2026-11-20')).toBe('sheet-25');
    expect(resolveInitialDaySheetId(sheets, '2026-12-02')).toBe('sheet-25');
    expect(resolveInitialDaySheetId([], '2026-11-25')).toBeNull();
  });
});
