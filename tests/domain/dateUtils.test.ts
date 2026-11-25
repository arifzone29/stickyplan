import { describe, expect, it } from 'vitest';
import {
  formatDateHeaderId,
  formatDatePillId,
  getLocalDateString,
  getNextCalendarDate,
  isValidCalendarDate,
  resolveInitialDaySheetId,
} from '../../src/domain/dateUtils';

describe('dateUtils (v2.0)', () => {
  it('computes local YYYY-MM-DD without UTC day-shift at 01:45 early morning', () => {
    const earlyMorningLocal = new Date(2026, 10, 26, 1, 45, 0);
    expect(getLocalDateString(earlyMorningLocal)).toBe('2026-11-26');
    expect(getNextCalendarDate('2026-11-26')).toBe('2026-11-27');
  });

  it('validates real calendar dates including leap years and rejects impossible dates', () => {
    expect(isValidCalendarDate('2026-11-26')).toBe(true);
    expect(isValidCalendarDate('2028-02-29')).toBe(true);

    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('2026-02-31')).toBe(false);
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('   ')).toBe(false);
  });

  it('formats Indonesian full header and compact pill labels per Design System spec', () => {
    expect(formatDateHeaderId('2026-11-26')).toBe('Kamis, 26 Nov 2026');
    expect(formatDatePillId('2026-11-26')).toBe('26 Nov');
  });

  it('resolves initial day sheet: exact today match, upcoming gap date, pre-trip, post-trip, and empty', () => {
    const sheets = [
      { id: 'sheet-27', date: '2026-11-27' },
      { id: 'sheet-26', date: '2026-11-26' },
      { id: 'sheet-29', date: '2026-11-29' },
    ];

    expect(resolveInitialDaySheetId(sheets, '2026-11-26')).toBe('sheet-26');
    expect(resolveInitialDaySheetId(sheets, '2026-11-28')).toBe('sheet-29');
    expect(resolveInitialDaySheetId(sheets, '2026-11-20')).toBe('sheet-26');
    expect(resolveInitialDaySheetId(sheets, '2026-12-02')).toBe('sheet-26');
    expect(resolveInitialDaySheetId([], '2026-11-26')).toBeNull();
  });
});
