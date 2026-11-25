import { useState } from 'preact/hooks';
import { MAX_TRIP_TITLE_LENGTH } from '../domain/types';
import {
  CheckIcon,
  EditIcon,
  LayersIcon,
  SettingsIcon,
  WifiOffIcon,
} from './Icons';

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
    <header className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200/80 px-4 pt-2.5 pb-2">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <LayersIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              STICKYPLAN
            </span>
            {!isOnline && (
              <span
                role="status"
                className="inline-flex items-center gap-1 rounded-full bg-stone-200/90 px-2 py-0.5 text-[10px] font-bold text-stone-700"
              >
                <WifiOffIcon className="w-3 h-3" />
                Offline siap
              </span>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={submitTitle} className="flex items-center gap-1.5">
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
                className="min-h-[40px] flex-1 rounded-xl border border-stone-300 bg-white px-3 py-1 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Simpan judul perjalanan"
                className="inline-flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-stone-900 text-white active:scale-95 transition-transform"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              aria-label={`Ubah judul perjalanan: ${tripTitle}`}
              className="group inline-flex max-w-full min-h-[32px] items-center gap-1.5 rounded-lg py-0.5 text-left hover:text-stone-700"
            >
              <span className="truncate text-sm font-bold leading-snug text-stone-900">
                {tripTitle}
              </span>
              <EditIcon className="w-3.5 h-3.5 shrink-0 text-stone-400 opacity-70 group-hover:opacity-100" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenDataManage}
          aria-label="Kelola Data"
          className="relative inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-2xs hover:bg-stone-100 active:scale-95 transition-transform"
        >
          <SettingsIcon className="w-5 h-5" />
          {hasNeverExported && (
            <span
              aria-hidden="true"
              title="Belum pernah di-backup"
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-stone-50"
            />
          )}
        </button>
      </div>

      {errorMsg && (
        <p role="alert" className="mt-1 mb-0 text-xs font-medium text-red-600">
          {errorMsg}
        </p>
      )}
    </header>
  );
}
