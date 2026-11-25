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
      className="bottom-sheet-dialog z-40 m-0 mt-auto mx-auto w-full max-w-md max-h-[88dvh] rounded-t-3xl border-0 bg-white p-0 text-stone-900 shadow-2xl"
    >
      <div className="pt-2.5 pb-1 flex justify-center shrink-0">
        <div aria-hidden="true" className="h-1 w-10 rounded-full bg-stone-300" />
      </div>
      <div className="flex items-center justify-between border-b border-stone-200 px-5 pb-3 pt-1 shrink-0">
        <h1 id={titleId} className="text-base font-bold text-stone-900 m-0">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Tutup panel"
          className="inline-flex h-9 w-9 min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 active:scale-95 transition-transform"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4 safe-bottom-pad">
        {children}
      </div>
    </dialog>
  );
}
