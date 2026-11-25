import type { DaySheetRecord } from './types';
import { sortDaySheets } from './sorting';

const INDONESIAN_DAYS_FULL = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const INDONESIAN_DAYS_SHORT = [
  'Min',
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab',
] as const;

const INDONESIAN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

interface LocalDateParts {
  year: number;
  monthIndex: number;
  day: number;
}

function padTwoDigits(num: number): string {
  return String(num).padStart(2, '0');
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padTwoDigits(date.getMonth() + 1);
  const day = padTwoDigits(date.getDate());
  return `${year}-${month}-${day}`;
}

function parseDateParts(dateStr: string): LocalDateParts | null {
  const match = DATE_PATTERN.exec(dateStr.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const candidate = new Date(year, month - 1, day);
  const isSameDate =
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;

  if (!isSameDate) return null;

  return { year, monthIndex: month - 1, day };
}

export function isValidCalendarDate(dateStr: string): boolean {
  return parseDateParts(dateStr) !== null;
}

export function formatDateHeaderId(dateStr: string): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr;

  const localDate = new Date(parts.year, parts.monthIndex, parts.day);
  const dayName = INDONESIAN_DAYS_FULL[localDate.getDay()] ?? '';
  const monthName = INDONESIAN_MONTHS_SHORT[parts.monthIndex] ?? '';
  return `${dayName}, ${parts.day} ${monthName} ${parts.year}`;
}

export function formatDatePillId(dateStr: string): string {
  const parts = parseDateParts(dateStr);
  if (!parts) return dateStr;

  const localDate = new Date(parts.year, parts.monthIndex, parts.day);
  const dayShort = INDONESIAN_DAYS_SHORT[localDate.getDay()] ?? '';
  const monthName = INDONESIAN_MONTHS_SHORT[parts.monthIndex] ?? '';
  return `${dayShort}, ${parts.day} ${monthName}`;
}

export function resolveInitialDaySheetId(
  sheets: readonly DaySheetRecord[],
  todayLocal: string = getLocalDateString(),
): string | null {
  if (sheets.length === 0) return null;

  const chronological = sortDaySheets(sheets);
  const exactMatch = chronological.find((sheet) => sheet.date === todayLocal);
  if (exactMatch) return exactMatch.id;

  const upcomingMatch = chronological.find((sheet) => sheet.date > todayLocal);
  if (upcomingMatch) return upcomingMatch.id;

  return chronological[0]?.id ?? null;
}
