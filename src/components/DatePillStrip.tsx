import { useEffect, useRef, useState } from 'preact/hooks';
import { formatDatePillId } from '../domain/dateUtils';
import {
  DEFAULT_NOTE_COLOR,
  MAX_DAY_SUMMARY_LENGTH,
  type DaySheetInputDto,
  type DaySheetRecord,
  type NoteColor,
} from '../domain/types';
import { PlusIcon } from './Icons';
import { ModalSheet } from './ModalSheet';

interface DatePillStripProps {
  sheets: readonly DaySheetRecord[];
  activeSheetId: string | null;
  todayLocal: string;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: (dto: DaySheetInputDto) => string | null;
}

const NOTE_COLOR_OPTIONS: ReadonlyArray<{
  value: NoteColor;
  label: string;
  swatch: string;
}> = [
  { value: 'warm-yellow', label: 'Kuning Kertas', swatch: '#FFFBEB' },
  { value: 'soft-cream', label: 'Krem Hangat', swatch: '#FAF6EE' },
  { value: 'sage-mint', label: 'Hijau Mint', swatch: '#ECFDF5' },
  { value: 'sky-pale', label: 'Biru Langit', swatch: '#F0F9FF' },
];

export function DatePillStrip({
  sheets,
  activeSheetId,
  todayLocal,
  onSelectSheet,
  onAddSheet,
}: DatePillStripProps) {
  const activePillRef = useRef<HTMLButtonElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dateVal, setDateVal] = useState(todayLocal);
  const [noteColor, setNoteColor] = useState<NoteColor>(DEFAULT_NOTE_COLOR);
  const [daySummary, setDaySummary] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      activePillRef.current &&
      typeof activePillRef.current.scrollIntoView === 'function'
    ) {
      activePillRef.current.scrollIntoView({
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeSheetId]);

  function openAddSheet(): void {
    const lastSheet = sheets[sheets.length - 1];
    if (lastSheet) {
      const parts = lastSheet.date.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const nextDay = new Date(parts[0], parts[1] - 1, parts[2] + 1);
        const yyyy = nextDay.getFullYear();
        const mm = String(nextDay.getMonth() + 1).padStart(2, '0');
        const dd = String(nextDay.getDate()).padStart(2, '0');
        setDateVal(`${yyyy}-${mm}-${dd}`);
      } else {
        setDateVal(todayLocal);
      }
    } else {
      setDateVal(todayLocal);
    }
    setNoteColor(DEFAULT_NOTE_COLOR);
    setDaySummary('');
    setErrorMsg(null);
    setIsAddOpen(true);
  }

  function handleAddSubmit(event: Event): void {
    event.preventDefault();
    const err = onAddSheet({
      date: dateVal,
      note_color: noteColor,
      day_summary: daySummary.trim() ? daySummary.trim() : null,
    });
    if (err) {
      setErrorMsg(err);
      dateInputRef.current?.focus();
      return;
    }
    setIsAddOpen(false);
  }

  return (
    <nav
      aria-label="Navigasi tanggal perjalanan"
      data-no-swipe
      className="w-full max-w-[460px] mx-auto px-3 pb-2"
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          const isToday = sheet.date === todayLocal;
          return (
            <button
              key={sheet.id}
              ref={isActive ? activePillRef : undefined}
              type="button"
              aria-current={isActive ? 'date' : undefined}
              onClick={() => onSelectSheet(sheet.id)}
              className={`shrink-0 inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-3.5 text-[14px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#1C1917] text-[#FFFBEB]'
                  : 'border border-[#D6CFC2] bg-[var(--surface-sheet)] text-[var(--ink-primary)] hover:bg-[#EAE4D9]'
              }`}
            >
              <span>{formatDatePillId(sheet.date)}</span>
              {isToday && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? 'bg-[#F59E0B]' : 'bg-[var(--accent-primary)]'
                  }`}
                  title="Hari ini"
                />
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={openAddSheet}
          className="shrink-0 inline-flex min-h-[44px] items-center gap-1 rounded-[10px] border border-dashed border-[#A8A092] bg-transparent px-3 text-[14px] font-medium text-[var(--ink-primary)] hover:bg-[#E7E2D8]"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Tanggal</span>
        </button>
      </div>

      <ModalSheet
        isOpen={isAddOpen}
        title="Tambah Lembar Tanggal"
        onClose={() => setIsAddOpen(false)}
      >
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-sheet-date"
              className="text-[14px] font-medium text-[var(--ink-primary)]"
            >
              Pilih Tanggal <span aria-hidden="true">*</span>
            </label>
            <input
              ref={dateInputRef}
              id="new-sheet-date"
              name="date"
              type="date"
              required
              value={dateVal}
              aria-invalid={errorMsg ? 'true' : undefined}
              aria-describedby={errorMsg ? 'new-sheet-error' : undefined}
              onInput={(e) => {
                setDateVal((e.target as HTMLInputElement).value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full rounded-[10px] border border-[#BFB8AA] bg-white px-3 text-[var(--ink-primary)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-sheet-summary"
              className="text-[14px] font-medium text-[var(--ink-primary)]"
            >
              Catatan Singkat Hari (Opsional)
            </label>
            <input
              id="new-sheet-summary"
              name="day_summary"
              type="text"
              maxLength={MAX_DAY_SUMMARY_LENGTH}
              placeholder="Contoh: Hari 2 — Rapat & Kepulangan"
              value={daySummary}
              onInput={(e) =>
                setDaySummary((e.target as HTMLInputElement).value)
              }
              className="w-full rounded-[10px] border border-[#BFB8AA] bg-white px-3 text-[var(--ink-primary)]"
            />
          </div>

          <fieldset className="border-0 p-0 m-0">
            <legend className="text-[14px] font-medium text-[var(--ink-primary)] mb-2">
              Warna Kertas Sticky
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {NOTE_COLOR_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3 py-2 text-[14px] cursor-pointer ${
                    noteColor === opt.value
                      ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)] font-medium'
                      : 'border-[#D6CFC2]'
                  }`}
                  style={{ backgroundColor: opt.swatch }}
                >
                  <input
                    type="radio"
                    name="note_color"
                    value={opt.value}
                    checked={noteColor === opt.value}
                    onChange={() => setNoteColor(opt.value)}
                    className="accent-[#0F766E] w-4 h-4"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {errorMsg && (
            <p
              id="new-sheet-error"
              role="alert"
              className="text-[14px] font-medium text-[var(--danger)] m-0"
            >
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="min-h-[48px] rounded-[10px] border border-[#D6CFC2] px-4 text-[15px] font-medium text-[var(--ink-secondary)]"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[48px] flex-1 rounded-[10px] bg-[var(--accent-primary)] px-4 text-[15px] font-medium text-white hover:bg-[var(--accent-primary-hover)]"
            >
              Tambah Tanggal
            </button>
          </div>
        </form>
      </ModalSheet>
    </nav>
  );
}
