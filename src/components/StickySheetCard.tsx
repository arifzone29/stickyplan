import { formatDateHeaderId } from '../domain/dateUtils';
import type {
  DaySheetRecord,
  ItineraryItemRecord,
  NoteColor,
} from '../domain/types';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { ActivityRow } from './ActivityRow';
import { PlusIcon } from './Icons';

interface StickySheetCardProps {
  sheet: DaySheetRecord | null;
  sheetIndex: number;
  totalSheets: number;
  todayLocal: string;
  items: readonly ItineraryItemRecord[];
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onAddActivity: () => void;
  onEditActivity: (item: ItineraryItemRecord) => void;
  onAddFirstDate: () => void;
}

const SHEET_SURFACE_MAP: Record<
  NoteColor,
  { bg: string; border: string; tape: string }
> = {
  'warm-yellow': {
    bg: 'var(--surface-sticky-yellow)',
    border: 'var(--border-sticky)',
    tape: '#F59E0B',
  },
  'soft-cream': {
    bg: 'var(--surface-sticky-cream)',
    border: '#DDD5C4',
    tape: '#D97706',
  },
  'sage-mint': {
    bg: 'var(--surface-sticky-mint)',
    border: '#A7F3D0',
    tape: '#0D9488',
  },
  'sky-pale': {
    bg: 'var(--surface-sticky-sky)',
    border: '#BAE6FD',
    tape: '#0284C7',
  },
};

export function StickySheetCard({
  sheet,
  sheetIndex,
  totalSheets,
  todayLocal,
  items,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onAddActivity,
  onEditActivity,
  onAddFirstDate,
}: StickySheetCardProps) {
  const { dragOffsetX, touchHandlers } = useSwipeNavigation({
    canPrev,
    canNext,
    onPrev,
    onNext,
  });

  if (!sheet) {
    return (
      <main className="w-full max-w-[460px] mx-auto px-3 pb-28 flex-1 flex flex-col">
        <div className="rounded-[14px] border border-[#D6CFC2] bg-[var(--surface-sheet)] p-6 text-center shadow-[0_2px_8px_rgba(28,25,23,0.06)]">
          <h1 className="text-[18px] font-semibold text-[var(--ink-primary)] m-0">
            Belum ada lembar tanggal
          </h1>
          <p className="mt-2 mb-5 text-[14.5px] text-[var(--ink-secondary)]">
            Tambahkan tanggal perjalanan pertama untuk mulai menyusun agenda harian Anda.
          </p>
          <button
            type="button"
            onClick={onAddFirstDate}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-5 text-[15px] font-medium text-white hover:bg-[var(--accent-primary-hover)]"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Tambah Tanggal Pertama</span>
          </button>
        </div>
      </main>
    );
  }

  const palette =
    SHEET_SURFACE_MAP[sheet.note_color] ?? SHEET_SURFACE_MAP['warm-yellow'];
  const isToday = sheet.date === todayLocal;

  return (
    <main className="w-full max-w-[460px] mx-auto px-3 pb-28 flex-1 flex flex-col">
      <article
        {...touchHandlers}
        aria-label={`Jadwal ${formatDateHeaderId(sheet.date)}`}
        style={{
          backgroundColor: palette.bg,
          borderColor: palette.border,
          transform:
            dragOffsetX !== 0
              ? `translate3d(${dragOffsetX}px, 0, 0)`
              : undefined,
        }}
        className="overflow-hidden rounded-[14px] border shadow-[0_2px_8px_rgba(28,25,23,0.06)] transition-transform duration-150 ease-out"
      >
        <div
          aria-hidden="true"
          className="h-[5px] w-full"
          style={{ backgroundColor: palette.tape }}
        />

        <div className="border-b border-black/10 px-4 py-3.5">
          <div className="flex items-center justify-between gap-2 text-[12.5px] font-medium text-[var(--ink-secondary)]">
            <span>
              Hari {sheetIndex + 1} dari {totalSheets}
            </span>
            <div className="flex items-center gap-2">
              {isToday && (
                <span className="rounded-[6px] bg-[#0F766E]/12 px-2 py-0.5 text-[12px] font-semibold text-[var(--accent-primary)]">
                  Hari Ini
                </span>
              )}
              <span>{items.length} kegiatan</span>
            </div>
          </div>

          <h1 className="mt-1 mb-0 text-[20px] font-semibold leading-tight text-[var(--ink-primary)]">
            {formatDateHeaderId(sheet.date)}
          </h1>

          {sheet.day_summary && (
            <p className="mt-1 mb-0 text-[14px] text-[var(--ink-secondary)] break-words">
              {sheet.day_summary}
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="m-0 text-[15px] font-medium text-[var(--ink-primary)]">
              Belum ada kegiatan di tanggal ini
            </p>
            <p className="mt-1 mb-5 text-[13.5px] text-[var(--ink-secondary)]">
              Catat jam keberangkatan, rapat, hotel, atau titik kuliner beserta link Google Maps.
            </p>
            <button
              type="button"
              onClick={onAddActivity}
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent-primary)] px-4 text-[15px] font-medium text-white hover:bg-[var(--accent-primary-hover)]"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Tambah Kegiatan Pertama</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06] py-1">
            {items.map((item) => (
              <ActivityRow
                key={item.id}
                item={item}
                onEdit={onEditActivity}
              />
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
