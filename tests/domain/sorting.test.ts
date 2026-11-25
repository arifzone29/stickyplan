import { describe, expect, it } from 'vitest';
import {
  getNextSortOrderForTime,
  sortDaySheets,
  sortItineraryItems,
} from '../../src/domain/sorting';
import type { DaySheetRecord, ItineraryItemRecord } from '../../src/domain/types';

function makeItem(
  id: string,
  start_time: string,
  sort_order: number,
): ItineraryItemRecord {
  return {
    id,
    day_sheet_id: 'sheet-1',
    start_time,
    title: `Kegiatan ${id}`,
    description: null,
    maps_url: null,
    sort_order,
    created_at: '2026-11-25T01:00:00.000Z',
  };
}

describe('sorting', () => {
  it('sorts itinerary items by start_time ASC and breaks ties by sort_order ASC without mutating input', () => {
    const raw = [
      makeItem('c', '14:30', 0),
      makeItem('b2', '12:00', 2),
      makeItem('a', '07:15', 0),
      makeItem('b1', '12:00', 1),
    ];
    const snapshot = [...raw];

    const sorted = sortItineraryItems(raw);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b1', 'b2', 'c']);
    expect(raw).toEqual(snapshot);
  });

  it('computes next deterministic sort_order for items sharing the same HH:mm', () => {
    const items = [makeItem('x', '12:00', 0), makeItem('y', '12:00', 3)];
    expect(getNextSortOrderForTime(items, '09:00')).toBe(0);
    expect(getNextSortOrderForTime(items, '12:00')).toBe(4);
  });

  it('sorts day sheets chronologically by date ASC without mutating input', () => {
    const sheets: DaySheetRecord[] = [
      { id: '2', trip_id: 't1', date: '2026-11-27', note_color: 'warm-yellow', day_summary: null },
      { id: '1', trip_id: 't1', date: '2026-11-25', note_color: 'warm-yellow', day_summary: null },
    ];
    const sorted = sortDaySheets(sheets);
    expect(sorted.map((s) => s.id)).toEqual(['1', '2']);
    expect(sheets[0]?.id).toBe('2');
  });
});
