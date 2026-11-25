import { useEffect, useRef, useState } from 'preact/hooks';
import { formatDateHeaderId } from '../domain/dateUtils';
import {
  MAX_DAY_SUMMARY_LENGTH,
  NOTE_COLORS,
  type DaySheet,
  type ItineraryItem,
  type NoteColor,
} from '../domain/types';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { ActivityRow } from './ActivityRow';
import {
  ArrowUpDownIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  PlusIcon,
} from './Icons';

interface StickySheetCardProps {
  sheet: DaySheet | null;
  sheetIndex: number;
  totalSheets: number;
  todayLocal: string;
  openItemId: string | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleItem: (itemId: string) => void;
  onChangeColor: (color: NoteColor) => void;
  onSaveSummary: (summary: string | null) => void;
  onSortByTime: () => void;
  onCopyDayText: () => void;
  onReorderItem: (fromIndex: number, toIndex: number) => void;
  onAddActivity: () => void;
  onEditActivity: (item: ItineraryItem) => void;
  onDeleteActivity: (item: ItineraryItem) => void;
  onAddFirstDate: () => void;
}

const PAPER_THEME_STYLES: Record<
  NoteColor,
  {
    cardBg: string;
    cardBorder: string;
    hoverBg: string;
    expandedBg: string;
    badge: string;
    dot: string;
    label: string;
  }
> = {
  'warm-yellow': {
    cardBg: 'bg-[#FEFCE8]',
    cardBorder: 'border-yellow-200/90',
    hoverBg: 'hover:bg-yellow-100/50',
    expandedBg: 'bg-yellow-100/45',
    badge: 'bg-yellow-200/75 text-yellow-900',
    dot: 'bg-yellow-300 border-yellow-500',
    label: 'Kuning Kertas',
  },
  mint: {
    cardBg: 'bg-[#ECFDF5]',
    cardBorder: 'border-emerald-200/90',
    hoverBg: 'hover:bg-emerald-100/50',
    expandedBg: 'bg-emerald-100/45',
    badge: 'bg-emerald-200/75 text-emerald-900',
    dot: 'bg-emerald-300 border-emerald-500',
    label: 'Mint Lembut',
  },
  cream: {
    cardBg: 'bg-[#FAF5F0]',
    cardBorder: 'border-stone-200',
    hoverBg: 'hover:bg-stone-200/40',
    expandedBg: 'bg-stone-200/35',
    badge: 'bg-stone-200/80 text-stone-800',
    dot: 'bg-orange-200 border-orange-400',
    label: 'Krem Hangat',
  },
  'soft-blue': {
    cardBg: 'bg-[#EFF6FF]',
    cardBorder: 'border-sky-200/90',
    hoverBg: 'hover:bg-sky-100/50',
    expandedBg: 'bg-sky-100/45',
    badge: 'bg-sky-200/75 text-sky-900',
    dot: 'bg-sky-300 border-sky-500',
    label: 'Biru Muda',
  },
};

export function StickySheetCard({
  sheet,
  sheetIndex,
  totalSheets,
  todayLocal,
  openItemId,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onToggleItem,
  onChangeColor,
  onSaveSummary,
  onSortByTime,
  onCopyDayText,
  onReorderItem,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onAddFirstDate,
}: StickySheetCardProps) {
  const { dragOffsetX, touchHandlers } = useSwipeNavigation({
    canPrev,
    canNext,
    onPrev,
    onNext,
  });

  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [liveReorderAnnouncement, setLiveReorderAnnouncement] = useState('');

  const listRef = useRef<HTMLUListElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    setIsEditingSummary(false);
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, [sheet?.id]);

  function startPointerReorder(event: PointerEvent, startIndex: number): void {
    if (event.button !== 0 || activePointerIdRef.current !== null) return;
    if (!sheet || sheet.items.length <= 1) return;

    const handleEl = event.currentTarget as HTMLElement;
    activePointerIdRef.current = event.pointerId;
    setDraggedIndex(startIndex);
    setDropTargetIndex(startIndex);
    document.documentElement.classList.add('is-dragging-item');

    try {
      handleEl.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic test events may omit native pointer capture
    }

    let currentTargetIdx = startIndex;

    const computeTargetIndex = (clientY: number): number => {
      const ul = listRef.current;
      if (!ul) return startIndex;
      const children = Array.from(
        ul.querySelectorAll<HTMLElement>(':scope > li[data-item-index]'),
      );
      for (let i = 0; i < children.length; i++) {
        const rect = children[i]!.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (clientY < midpoint) {
          return i;
        }
      }
      return Math.max(0, children.length - 1);
    };

    const cleanup = () => {
      activePointerIdRef.current = null;
      setDraggedIndex(null);
      setDropTargetIndex(null);
      document.documentElement.classList.remove('is-dragging-item');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
    };

    const onPointerMove = (moveEv: PointerEvent) => {
      if (moveEv.pointerId !== activePointerIdRef.current) return;
      const nextIdx = computeTargetIndex(moveEv.clientY);
      currentTargetIdx = nextIdx;
      setDropTargetIndex(nextIdx);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      if (upEv.pointerId !== activePointerIdRef.current) return;
      const finalIdx = currentTargetIdx;
      cleanup();
      if (finalIdx !== startIndex && sheet.items[startIndex]) {
        const movedTitle = sheet.items[startIndex]!.title;
        onReorderItem(startIndex, finalIdx);
        setLiveReorderAnnouncement(
          `${movedTitle} dipindahkan ke urutan ${finalIdx + 1}`,
        );
      }
    };

    const onPointerCancel = (cancelEv: PointerEvent) => {
      if (cancelEv.pointerId !== activePointerIdRef.current) return;
      cleanup();
    };

    const onKeyDown = (keyEv: KeyboardEvent) => {
      if (keyEv.key === 'Escape') {
        keyEv.preventDefault();
        cleanup();
        setLiveReorderAnnouncement('Pemindahan urutan dibatalkan');
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('keydown', onKeyDown);
  }

  if (!sheet) {
    return (
      <main className="px-4 pb-8 flex-1 flex flex-col">
        <div className="rounded-2xl border border-stone-200 bg-white p-7 text-center shadow-sm">
          <CalendarIcon className="w-8 h-8 mx-auto text-stone-400 mb-2" />
          <h1 className="text-base font-bold text-stone-900 m-0">
            Belum ada lembar tanggal
          </h1>
          <p className="mt-1.5 mb-5 text-xs leading-relaxed text-stone-600">
            Tambahkan tanggal perjalanan pertama untuk mulai menyusun agenda harian Anda.
          </p>
          <button
            type="button"
            onClick={onAddFirstDate}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-5 text-xs font-bold text-white hover:bg-stone-800 active:scale-95 transition-transform"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Tambah Tanggal Pertama</span>
          </button>
        </div>
      </main>
    );
  }

  const theme =
    PAPER_THEME_STYLES[sheet.note_color] ?? PAPER_THEME_STYLES['warm-yellow'];
  const isToday = sheet.date === todayLocal;

  function submitSummary(ev: Event): void {
    ev.preventDefault();
    onSaveSummary(summaryDraft.trim() ? summaryDraft.trim() : null);
    setIsEditingSummary(false);
  }

  return (
    <main className="px-4 pb-6 flex-1 flex flex-col">
      <div aria-live="polite" className="sr-only">
        {liveReorderAnnouncement}
      </div>

      <article
        {...touchHandlers}
        aria-label={`Jadwal ${formatDateHeaderId(sheet.date)}`}
        style={{
          transform:
            dragOffsetX !== 0
              ? `translate3d(${dragOffsetX}px, 0, 0)`
              : undefined,
        }}
        className={`overflow-hidden rounded-2xl border shadow-md shadow-stone-300/40 transition-colors duration-200 ${theme.cardBg} ${theme.cardBorder}`}
      >
        <div className="border-b border-stone-900/10 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${theme.badge}`}
              >
                Hari {sheetIndex + 1} dari {totalSheets}
              </span>
              {isToday && (
                <span className="inline-block rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-bold text-white">
                  Hari Ini
                </span>
              )}
            </div>

            <div className="flex items-center gap-2" data-no-swipe>
              <div
                className="flex items-center gap-1.5"
                role="group"
                aria-label="Pilih warna kertas"
              >
                {NOTE_COLORS.map((colorKey) => {
                  const cfg = PAPER_THEME_STYLES[colorKey];
                  const isSelected = sheet.note_color === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => onChangeColor(colorKey)}
                      aria-label={`Warna ${cfg.label}`}
                      aria-pressed={isSelected}
                      className={`h-4 w-4 rounded-full border transition-transform ${cfg.dot} ${
                        isSelected
                          ? 'scale-125 ring-2 ring-stone-900 ring-offset-1'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onCopyDayText}
                aria-label="Salin jadwal hari ini ke WhatsApp"
                title="Salin jadwal hari ini ke WhatsApp"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-900/12 bg-white/70 text-stone-700 hover:bg-white active:scale-95 transition-transform"
              >
                <CopyIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h2 className="m-0 text-lg font-extrabold tracking-tight text-stone-900">
            {formatDateHeaderId(sheet.date)}
          </h2>

          {isEditingSummary ? (
            <form
              onSubmit={submitSummary}
              className="mt-1.5 flex items-center gap-1.5"
              data-no-swipe
            >
              <label htmlFor="day-summary-inline" className="sr-only">
                Ringkasan Hari
              </label>
              <input
                id="day-summary-inline"
                type="text"
                maxLength={MAX_DAY_SUMMARY_LENGTH}
                placeholder="Tambahkan ringkasan hari..."
                value={summaryDraft}
                autoFocus
                onInput={(e) =>
                  setSummaryDraft((e.target as HTMLInputElement).value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsEditingSummary(false);
                }}
                className="min-h-[36px] flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Simpan ringkasan hari"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSummaryDraft(sheet.day_summary ?? '');
                setIsEditingSummary(true);
              }}
              aria-label="Ubah ringkasan hari"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-md py-0.5 text-left text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              <span className="break-words">
                {sheet.day_summary || 'Tambah catatan fokus hari ini...'}
              </span>
              <EditIcon className="w-3 h-3 shrink-0 opacity-60" />
            </button>
          )}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-stone-600">
              {sheet.items.length} kegiatan
            </span>

            {sheet.items.length > 1 && (
              <button
                type="button"
                onClick={onSortByTime}
                className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-stone-900/12 bg-white/75 px-2.5 py-1 text-[11px] font-bold text-stone-800 hover:bg-white active:scale-95 transition-transform"
              >
                <ArrowUpDownIcon className="w-3 h-3" />
                <span>Urutkan Jam</span>
              </button>
            )}
          </div>
        </div>

        {sheet.items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CalendarIcon className="w-8 h-8 mx-auto text-stone-500 opacity-60 mb-2" />
            <p className="m-0 text-sm font-bold text-stone-900">
              Belum ada kegiatan di tanggal ini
            </p>
            <p className="mt-1 mb-5 text-xs leading-relaxed text-stone-600">
              Ketuk tombol <strong>Tambah Kegiatan</strong> di bawah atau gunakan{' '}
              <strong>Bulk Input</strong> untuk menyalin tabel rundown sekaligus.
            </p>
            <button
              type="button"
              onClick={onAddActivity}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 text-xs font-bold text-white hover:bg-stone-800 active:scale-95 transition-transform"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Tambah Kegiatan Pertama</span>
            </button>
          </div>
        ) : (
          <ul
            ref={listRef}
            className="m-0 list-none divide-y divide-stone-900/10 p-0"
          >
            {sheet.items.map((item, idx) => (
              <ActivityRow
                key={item.id}
                item={item}
                index={idx}
                totalItems={sheet.items.length}
                isOpen={openItemId === item.id}
                isDragged={draggedIndex === idx}
                isDropTarget={
                  draggedIndex !== null &&
                  dropTargetIndex === idx &&
                  dropTargetIndex !== draggedIndex
                }
                expandedBgClass={theme.expandedBg}
                hoverBgClass={theme.hoverBg}
                onToggle={() => onToggleItem(item.id)}
                onMoveUp={() => {
                  if (idx > 0) {
                    onReorderItem(idx, idx - 1);
                    setLiveReorderAnnouncement(
                      `${item.title} digeser ke urutan ${idx}`,
                    );
                  }
                }}
                onMoveDown={() => {
                  if (idx < sheet.items.length - 1) {
                    onReorderItem(idx, idx + 1);
                    setLiveReorderAnnouncement(
                      `${item.title} digeser ke urutan ${idx + 2}`,
                    );
                  }
                }}
                onEdit={() => onEditActivity(item)}
                onDeleteRequest={() => onDeleteActivity(item)}
                onHandlePointerDown={(ev) => startPointerReorder(ev, idx)}
              />
            ))}
          </ul>
        )}
      </article>

      <p className="mt-2.5 mb-0 text-center text-[11px] font-medium text-stone-400">
        Geser kartu kiri/kanan atau gunakan Prev / Next
      </p>
    </main>
  );
}
