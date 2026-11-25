import { useState } from 'preact/hooks';
import { MAX_TRIP_TITLE_LENGTH } from '../domain/types';
import { EditIcon, SlidersIcon, WifiOffIcon } from './Icons';

interface TopBarProps {
  tripTitle: string;
  isOnline: boolean;
  hasNeverExported: boolean;
  onSaveTripTitle: (newTitle: string) => string | null;
  onOpenDataManage: () => void;
}

export function TopBar({
  tripTitle,
  isOnline,
  hasNeverExported,
  onSaveTripTitle,
  onOpenDataManage,
}: TopBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(tripTitle);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function startEdit(): void {
    setDraft(tripTitle);
    setErrorMsg(null);
    setIsEditing(true);
  }

  function submitTitle(event: Event): void {
    event.preventDefault();
    const err = onSaveTripTitle(draft);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setIsEditing(false);
  }

  return (
    <header className="w-full max-w-[460px] mx-auto px-3 pt-3 pb-2">
      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <form onSubmit={submitTitle} className="flex-1 flex items-center gap-2">
            <label htmlFor="trip-title-input" className="sr-only">
              Judul Perjalanan
            </label>
            <input
              id="trip-title-input"
              name="trip_title"
              type="text"
              value={draft}
              maxLength={MAX_TRIP_TITLE_LENGTH}
              required
              autoFocus
              aria-invalid={errorMsg ? 'true' : undefined}
              onInput={(e) => {
                setDraft((e.target as HTMLInputElement).value);
                if (errorMsg) setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setErrorMsg(null);
                }
              }}
              className="flex-1 rounded-[10px] border border-[#BFB8AA] bg-white px-3 py-1.5 text-[16px] font-medium text-[var(--ink-primary)]"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-[10px] bg-[var(--accent-primary)] px-3 text-[14px] font-medium text-white"
            >
              Simpan
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            aria-label={`Ubah judul perjalanan: ${tripTitle}`}
            className="group inline-flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-[10px] px-2 -ml-2 text-left hover:bg-[#E7E2D8]/70"
          >
            <span className="truncate text-[18px] font-semibold tracking-tight text-[var(--ink-primary)]">
              {tripTitle}
            </span>
            <EditIcon className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)]" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {!isOnline && (
            <span
              role="status"
              className="inline-flex items-center gap-1 rounded-[8px] border border-[#D6CFC2] bg-[#EAE4D9] px-2 py-1 text-[12px] font-medium text-[var(--ink-secondary)]"
            >
              <WifiOffIcon className="w-3.5 h-3.5" />
              Offline siap
            </span>
          )}

          <button
            type="button"
            onClick={onOpenDataManage}
            aria-label="Kelola Data dan Tanggal"
            className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-[10px] border border-[#D6CFC2] bg-[var(--surface-sheet)] px-2.5 text-[13px] font-medium text-[var(--ink-primary)] hover:bg-[#EAE4D9]"
          >
            <SlidersIcon className="w-4 h-4" />
            <span className="hidden min-[380px]:inline">Kelola Data</span>
            {hasNeverExported && (
              <span
                aria-hidden="true"
                title="Belum pernah di-backup"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#D97706] ring-2 ring-[var(--bg-canvas)]"
              />
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <p role="alert" className="mt-1 text-[13px] text-[var(--danger)]">
          {errorMsg}
        </p>
      )}
    </header>
  );
}
