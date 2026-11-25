import type { DaySheet, ItineraryItem } from './types';

export function sortItineraryItems<T extends Pick<ItineraryItem, 'start_time'>>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) =>
    left.start_time.localeCompare(right.start_time),
  );
}

export function reorderArrayItem<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return [...items];
  next.splice(toIndex, 0, moved);
  return next;
}

export function sortDaySheets<T extends Pick<DaySheet, 'id' | 'date'>>(
  sheets: readonly T[],
): T[] {
  return [...sheets].sort((left, right) => {
    const dateDiff = left.date.localeCompare(right.date);
    if (dateDiff !== 0) return dateDiff;
    return left.id.localeCompare(right.id);
  });
}
