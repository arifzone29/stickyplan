import { parseSmartMapsInput } from './mapsUrl';
import {
  MAX_ACTIVITY_DESCRIPTION_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH,
  type ActivityInputDto,
} from './types';

const HEADER_FIRST_CELL_REGEX = /^(?:no\.?|waktu|jam|time|pukul|agenda|jadwal)$/i;
const TIME_EXTRACTION_REGEX = /(\d{1,2})[:.](\d{2})/;
const RANGE_INDICATOR_REGEX = /\d{1,2}[:.]\d{2}\s*[-–—]\s*(?:\d{1,2}[:.]\d{2}|selesai)/i;
const SPACE_LINE_REGEX =
  /^((\d{1,2})[:.](\d{2})(?:\s*[-–—]\s*(?:\d{1,2}[:.]\d{2}|selesai))?)\s+(.+)$/i;

function normalizeHourMinute(
  rawHour: string,
  rawMinute: string,
): string | null {
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function resolveSafeMapsOrNull(rawMaps: string | undefined): string | null {
  if (!rawMaps) return null;
  const parsed = parseSmartMapsInput(rawMaps);
  if (parsed.status === 'direct_url' || parsed.status === 'search_fallback') {
    return parsed.url;
  }
  return null;
}

export function parseBulkInputText(rawText: string): ActivityInputDto[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const results: ActivityInputDto[] = [];

  for (const line of lines) {
    if (line.includes('|') || line.includes('\t')) {
      const separator = line.includes('\t') ? '\t' : '|';
      const rawCols = line.split(separator).map((col) => col.trim());
      const firstCol = rawCols[0] ?? '';

      // Skip Word/Excel header rows like "Waktu \t Agenda \t Keterangan" or "No \t Waktu \t ..."
      if (
        HEADER_FIRST_CELL_REGEX.test(firstCol) &&
        !TIME_EXTRACTION_REGEX.test(firstCol)
      ) {
        continue;
      }

      // Support optional leading "No." column in copied tables (e.g., "1 \t 10.30-12.00 \t Agenda")
      const cols =
        /^\d+\.?$/.test(firstCol) &&
        rawCols.length >= 3 &&
        TIME_EXTRACTION_REGEX.test(rawCols[1] ?? '')
          ? rawCols.slice(1)
          : rawCols;

      const timeCell = cols[0] ?? '';
      const timeMatch = TIME_EXTRACTION_REGEX.exec(timeCell);

      let startTime = '09:00';
      let title = '';
      let description: string | null = null;
      let mapsUrl: string | null = null;

      if (timeMatch && timeMatch[1] && timeMatch[2]) {
        startTime = normalizeHourMinute(timeMatch[1], timeMatch[2]) ?? '09:00';
        title = (cols[1] ?? '').slice(0, MAX_ACTIVITY_TITLE_LENGTH).trim();
        const detailCol = (cols[2] ?? '').trim();
        const hasRange = RANGE_INDICATOR_REGEX.test(timeCell);

        if (hasRange) {
          const combined = detailCol ? `${timeCell} | ${detailCol}` : timeCell;
          description = combined.slice(0, MAX_ACTIVITY_DESCRIPTION_LENGTH);
        } else {
          description = detailCol
            ? detailCol.slice(0, MAX_ACTIVITY_DESCRIPTION_LENGTH)
            : null;
        }
        mapsUrl = resolveSafeMapsOrNull(cols[3]);
      } else {
        title = timeCell.slice(0, MAX_ACTIVITY_TITLE_LENGTH).trim();
        const detailCol = (cols[1] ?? '').trim();
        description = detailCol
          ? detailCol.slice(0, MAX_ACTIVITY_DESCRIPTION_LENGTH)
          : null;
        mapsUrl = resolveSafeMapsOrNull(cols[2]);
      }

      if (title.length > 0) {
        results.push({
          start_time: startTime,
          title,
          description,
          maps_url: mapsUrl,
        });
      }
      continue;
    }

    const spaceMatch = SPACE_LINE_REGEX.exec(line);
    if (spaceMatch && spaceMatch[1] && spaceMatch[2] && spaceMatch[3] && spaceMatch[4]) {
      const fullTimeToken = spaceMatch[1].trim();
      const normalized =
        normalizeHourMinute(spaceMatch[2], spaceMatch[3]) ?? '09:00';
      const title = spaceMatch[4].trim().slice(0, MAX_ACTIVITY_TITLE_LENGTH);
      const hasRange = RANGE_INDICATOR_REGEX.test(fullTimeToken);

      if (title.length > 0) {
        results.push({
          start_time: normalized,
          title,
          description: hasRange ? fullTimeToken : null,
          maps_url: null,
        });
      }
      continue;
    }

    const fallbackTitle = line.slice(0, MAX_ACTIVITY_TITLE_LENGTH).trim();
    if (fallbackTitle.length > 0 && !HEADER_FIRST_CELL_REGEX.test(fallbackTitle)) {
      results.push({
        start_time: '09:00',
        title: fallbackTitle,
        description: null,
        maps_url: null,
      });
    }
  }

  return results;
}
