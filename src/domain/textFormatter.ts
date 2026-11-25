import { formatDateHeaderId } from './dateUtils';
import { sortDaySheets, sortItineraryItems } from './sorting';
import type { ItineraryItemRecord, StickyPlanStoreV1 } from './types';

export function formatTripAsPlainText(store: StickyPlanStoreV1): string {
  const activeTrip =
    store.trips.find((trip) => trip.id === store.active_trip_id) ??
    store.trips[0];

  if (!activeTrip) return '';

  const sheets = sortDaySheets(
    store.day_sheets.filter((sheet) => sheet.trip_id === activeTrip.id),
  );

  const itemsBySheetId = new Map<string, ItineraryItemRecord[]>();
  for (const item of store.itinerary_items) {
    const bucket = itemsBySheetId.get(item.day_sheet_id);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsBySheetId.set(item.day_sheet_id, [item]);
    }
  }

  const lines: string[] = [`*${activeTrip.title}*`];

  if (sheets.length === 0) {
    lines.push('Belum ada tanggal terjadwal.');
    return lines.join('\n');
  }

  for (const sheet of sheets) {
    lines.push('');
    const summaryPart = sheet.day_summary ? ` — ${sheet.day_summary}` : '';
    lines.push(`${formatDateHeaderId(sheet.date)}${summaryPart}`);

    const sortedItems = sortItineraryItems(itemsBySheetId.get(sheet.id) ?? []);
    if (sortedItems.length === 0) {
      lines.push('  (Belum ada kegiatan)');
      continue;
    }

    for (const item of sortedItems) {
      lines.push(`${item.start_time} - ${item.title}`);
      if (item.description) {
        lines.push(`  Catatan: ${item.description}`);
      }
      if (item.maps_url) {
        lines.push(`  Maps: ${item.maps_url}`);
      }
    }
  }

  return lines.join('\n');
}
