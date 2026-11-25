import { useEffect, useRef, useState } from 'preact/hooks';
import { formatDatePillId, getNextCalendarDate } from '../domain/dateUtils';
import {
  DEFAULT_NOTE_COLOR,
  MAX_DAY_SUMMARY_LENGTH,
  type DaySheet,
  type DaySheetInputDto,
  type NoteColor,
} from '../domain/types';
import { PlusIcon } from './Icons';
import { ModalSheet } from './ModalSheet';

interface DatePillStripProps {
  sheets: readonly DaySheet[];
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
  { value: 'warm-yellow', label: 'Kuning Kertas', swatch: '#FEFCE8' },
  { value: 'mint', label: 'Mint Lembut', swatch: '#ECFDF5' },
  { value: 'cream', label: 'Krem Hangat', swatch: '#FAF5F0' },
  { value: 'soft-blue', label: 'Biru Muda', swatch: '#EFF6FF' },
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
    setDateVal(lastSheet ? getNextCalendarDate(lastSheet.date) : todayLocal);
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
      className="px-4 py-2.5"
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
              className={`shrink-0 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all active:scale-95 ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span>{formatDatePillId(sheet.date)}</span>
              {isToday && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? 'bg-amber-400' : 'bg-emerald-600'
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
          aria-label="Tambah Tanggal"
          className="shrink-0 inline-flex min-h-[40px] items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-3.5 text-xs font-bold text-amber-900 hover:bg-amber-200/70 active:scale-95 transition-all"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Tanggal</span>
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
              className="text-xs font-bold text-stone-700"
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
              className="w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="new-sheet-summary"
              className="text-xs font-bold text-stone-700"
            >
              Ringkasan Hari (Opsional)
            </label>
            <input
              id="new-sheet-summary"
              name="day_summary"
              type="text"
              maxLength={MAX_DAY_SUMMARY_LENGTH}
              placeholder="Contoh: Hari 3 — Kepulangan ke Jakarta"
              value={daySummary}
              onInput={(e) =>
                setDaySummary((e.target as HTMLInputElement).value)
              }
              className="w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900"
            />
          </div>

          <fieldset className="border-0 p-0 m-0">
            <legend className="text-xs font-bold text-stone-700 mb-2">
              Warna Kertas Sticky
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {NOTE_COLOR_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer ${
                    noteColor === opt.value
                      ? 'border-stone-900 ring-1 ring-stone-900 text-stone-900'
                      : 'border-stone-200 text-stone-600'
                  }`}
                  style={{ backgroundColor: opt.swatch }}
                >
                  <input
                    type="radio"
                    name="note_color"
                    value={opt.value}
                    checked={noteColor === opt.value}
                    onChange={() => setNoteColor(opt.value)}
                    className="accent-stone-900 w-4 h-4"
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
              className="text-xs font-bold text-red-600 m-0"
            >
              {errorMsg}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="min-h-[46px] rounded-xl bg-stone-100 px-4 text-xs font-bold text-stone-700 hover:bg-stone-200"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[46px] flex-1 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-800 active:scale-[0.99] transition-transform"
            >
              Tambah Tanggal
            </button>
          </div>
        </form>
      </ModalSheet>
    </nav>
  );
}
