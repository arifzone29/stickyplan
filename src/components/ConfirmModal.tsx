import { useEffect, useId, useRef } from 'preact/hooks';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descId = useId();

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
      onCancel();
    };
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="confirm-modal-dialog z-50 m-auto w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-2xl"
    >
      <h1 id={titleId} className="m-0 text-base font-bold text-stone-900">
        {title}
      </h1>
      <p
        id={descId}
        className="mt-2 mb-5 text-xs leading-relaxed text-stone-600"
      >
        {message}
      </p>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="min-h-[44px] flex-1 rounded-xl bg-stone-100 px-3 text-xs font-bold text-stone-700 hover:bg-stone-200 active:scale-95 transition-transform"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
          }}
          className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700 active:scale-95 transition-transform"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
