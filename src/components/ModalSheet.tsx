import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';
import { CloseIcon } from './Icons';

interface ModalSheetProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}

export function ModalSheet({
  isOpen,
  title,
  onClose,
  children,
}: ModalSheetProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.returnValue = '';
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Safari fallback where declarative closedby="any" is not yet supported
    let cleanupFallback: (() => void) | undefined;
    if (
      typeof HTMLDialogElement !== 'undefined' &&
      !('closedBy' in HTMLDialogElement.prototype)
    ) {
      let pressedOutside = false;
      const isOutside = (ev: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          ev.clientX < rect.left ||
          ev.clientX > rect.right ||
          ev.clientY < rect.top ||
          ev.clientY > rect.bottom
        );
      };
      const onPointerDown = (ev: PointerEvent) => {
        pressedOutside = ev.target === dialog && isOutside(ev);
      };
      const onPointerUp = (ev: PointerEvent) => {
        if (pressedOutside && ev.target === dialog && isOutside(ev)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupFallback?.();
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="bottom-sheet-dialog m-0 mt-auto mx-auto w-full max-w-[460px] max-h-[88dvh] rounded-t-[20px] border-0 bg-[var(--surface-sheet)] p-0 text-[var(--ink-primary)] shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[#E7E2D8] px-4 py-3 shrink-0">
        <h1 id={titleId} className="text-[17px] font-semibold leading-snug m-0">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup panel"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] text-[var(--ink-secondary)] hover:bg-[#ECE7DD]"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto px-4 py-4 safe-bottom-pad">
        {children}
      </div>
    </dialog>
  );
}
