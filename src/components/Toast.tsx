import { useEffect, useState } from 'preact/hooks';
import { CloseIcon } from './Icons';

export interface ToastMessage {
  id: number;
  text: string;
  variant?: 'info' | 'error';
}

interface ToastRegionProps {
  toast: ToastMessage | null;
  isModalOpen: boolean;
  onDismiss: () => void;
}

export function ToastRegion({
  toast,
  isModalOpen,
  onDismiss,
}: ToastRegionProps) {
  const [isFocusInside, setIsFocusInside] = useState(false);

  useEffect(() => {
    if (!toast || isModalOpen || isFocusInside) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [toast, isModalOpen, isFocusInside, onDismiss]);

  return (
    <div
      role="region"
      aria-label="Notifikasi status"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none max-w-[92vw]"
    >
      <div aria-live="polite" className="sr-only">
        {toast && !isModalOpen ? toast.text : ''}
      </div>

      {toast && !isModalOpen && (
        <div
          onFocusIn={() => setIsFocusInside(true)}
          onFocusOut={() => setIsFocusInside(false)}
          className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg ${
            toast.variant === 'error' ? 'bg-red-600' : 'bg-stone-900'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Tutup notifikasi"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white/80 hover:text-white"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
