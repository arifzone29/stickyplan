import { describe, expect, it } from 'vitest';
import {
  reorderArrayItem,
  sortDaySheets,
  sortItineraryItems,
} from '../../src/domain/sorting';
import type { ItineraryItem } from '../../src/domain/types';

function makeItem(id: string, start_time: string): ItineraryItem {
  return {
    id,
    start_time,
    title: `Kegiatan ${id}`,
    description: null,
    maps_url: null,
  };
}

describe('sorting & custom reorder (v2.0)', () => {
  it('sorts itinerary items by start_time ASC stably without mutating input', () => {
    const raw = [
      makeItem('c', '14:30'),
      makeItem('b1', '12:00'),
      makeItem('a', '07:15'),
      makeItem('b2', '12:00'),
    ];
    const snapshot = [...raw];

    const sorted = sortItineraryItems(raw);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b1', 'b2', 'c']);
    expect(raw).toEqual(snapshot);
  });

  it('reorders items cleanly for drag-and-drop and touch arrow buttons', () => {
    const items = [makeItem('1', '09:00'), makeItem('2', '10:00'), makeItem('3', '11:00')];
    const moved = reorderArrayItem(items, 2, 0);
    expect(moved.map((i) => i.id)).toEqual(['3', '1', '2']);
    expect(items.map((i) => i.id)).toEqual(['1', '2', '3']);
  });

  it('sorts day sheets chronologically by date ASC', () => {
    const sheets = [
      { id: '2', date: '2026-11-27' },
      { id: '1', date: '2026-11-26' },
    ];
    expect(sortDaySheets(sheets).map((s) => s.id)).toEqual(['1', '2']);
  });
});
