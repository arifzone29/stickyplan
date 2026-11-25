import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from './Icons';

interface BottomThumbBarProps {
  canPrev: boolean;
  canNext: boolean;
  hasActiveSheet: boolean;
  onPrev: () => void;
  onNext: () => void;
  onAddActivity: () => void;
}

export function BottomThumbBar({
  canPrev,
  canNext,
  hasActiveSheet,
  onPrev,
  onNext,
  onAddActivity,
}: BottomThumbBarProps) {
  return (
    <footer
      data-no-swipe
      className="fixed bottom-0 inset-x-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur-md safe-bottom-pad pt-2.5"
    >
      <div className="mx-auto flex w-full max-w-md items-center gap-2.5 px-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Hari Sebelumnya"
          className="inline-flex min-h-[44px] min-w-[84px] items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-800 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-stone-100 active:scale-95 transition-transform"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={onAddActivity}
          disabled={!hasActiveSheet}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 active:scale-[0.99] transition-transform"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah Kegiatan</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Hari Berikutnya"
          className="inline-flex min-h-[44px] min-w-[84px] items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-800 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-stone-100 active:scale-95 transition-transform"
        >
          <span>Next</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
}
