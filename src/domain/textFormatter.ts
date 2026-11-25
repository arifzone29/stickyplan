import { formatDateHeaderId } from './dateUtils';
import { isAllowedGoogleMapsUrl } from './mapsUrl';
import { sortDaySheets } from './sorting';
import type { DaySheet, StickyPlanStoreV1 } from './types';

export function formatDaySheetAsPlainText(sheet: DaySheet): string {
  const lines: string[] = [`*${formatDateHeaderId(sheet.date)}*`];
  if (sheet.day_summary) {
    lines.push(`_${sheet.day_summary}_`);
  }
  lines.push('');

  if (sheet.items.length === 0) {
    lines.push('(Belum ada kegiatan)');
    return lines.join('\n');
  }

  for (const item of sheet.items) {
    lines.push(`• ${item.start_time} - ${item.title}`);
    if (item.description) {
      lines.push(`  Catatan: ${item.description}`);
    }
    if (item.maps_url && isAllowedGoogleMapsUrl(item.maps_url)) {
      lines.push(`  Maps: ${item.maps_url}`);
    }
  }

  return lines.join('\n');
}

export function formatTripAsPlainText(store: StickyPlanStoreV1): string {
  const sheets = sortDaySheets(store.day_sheets);
  const lines: string[] = [`*${store.trip.title}*`];

  if (sheets.length === 0) {
    lines.push('Belum ada tanggal terjadwal.');
    return lines.join('\n');
  }

  for (const sheet of sheets) {
    lines.push('');
    const summaryPart = sheet.day_summary ? ` — ${sheet.day_summary}` : '';
    lines.push(`${formatDateHeaderId(sheet.date)}${summaryPart}`);

    if (sheet.items.length === 0) {
      lines.push('  (Belum ada kegiatan)');
      continue;
    }

    for (const item of sheet.items) {
      lines.push(`${item.start_time} - ${item.title}`);
      if (item.description) {
        lines.push(`  Catatan: ${item.description}`);
      }
      if (item.maps_url && isAllowedGoogleMapsUrl(item.maps_url)) {
        lines.push(`  Maps: ${item.maps_url}`);
      }
    }
  }

  return lines.join('\n');
}
