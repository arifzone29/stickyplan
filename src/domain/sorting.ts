import type { DaySheetRecord, ItineraryItemRecord } from './types';

export function sortItineraryItems(
  items: readonly ItineraryItemRecord[],
): ItineraryItemRecord[] {
  return [...items].sort((left, right) => {
    const timeDiff = left.start_time.localeCompare(right.start_time);
    if (timeDiff !== 0) return timeDiff;

    const orderDiff = left.sort_order - right.sort_order;
    if (orderDiff !== 0) return orderDiff;

    return left.id.localeCompare(right.id);
  });
}

export function getNextSortOrderForTime(
  items: readonly ItineraryItemRecord[],
  startTime: string,
): number {
  let maxOrder = -1;
  for (const item of items) {
    if (item.start_time === startTime && item.sort_order > maxOrder) {
      maxOrder = item.sort_order;
    }
  }
  return maxOrder + 1;
}

export function sortDaySheets(
  sheets: readonly DaySheetRecord[],
): DaySheetRecord[] {
  return [...sheets].sort((left, right) => {
    const dateDiff = left.date.localeCompare(right.date);
    if (dateDiff !== 0) return dateDiff;
    return left.id.localeCompare(right.id);
  });
}
