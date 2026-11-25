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
    <div
      data-no-swipe
      className="fixed bottom-0 inset-x-0 z-20 border-t border-[#DED8CC] bg-[var(--surface-sheet)]/95 backdrop-blur-[2px] safe-bottom-pad pt-2.5"
    >
      <div className="mx-auto flex w-full max-w-[460px] items-center gap-2 px-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Hari Sebelumnya"
          className="inline-flex min-h-[48px] min-w-[68px] items-center justify-center gap-1 rounded-[10px] border border-[#D6CFC2] bg-white px-3 text-[14px] font-medium text-[var(--ink-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F4F0E8]"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={onAddActivity}
          disabled={!hasActiveSheet}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--accent-primary)] px-4 text-[15px] font-semibold text-white disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--accent-primary-hover)]"
        >
          <PlusIcon className="w-5 h-5" />
          <span>+ Kegiatan</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Hari Berikutnya"
          className="inline-flex min-h-[48px] min-w-[68px] items-center justify-center gap-1 rounded-[10px] border border-[#D6CFC2] bg-white px-3 text-[14px] font-medium text-[var(--ink-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F4F0E8]"
        >
          <span>Next</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
