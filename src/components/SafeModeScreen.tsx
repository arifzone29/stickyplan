import { useState } from 'preact/hooks';
import { AlertTriangleIcon, CopyIcon } from './Icons';

interface SafeModeScreenProps {
  rawSnapshot: string;
  reason: string;
  onResetSafeMode: () => void;
}

export function SafeModeScreen({
  rawSnapshot,
  reason,
  onResetSafeMode,
}: SafeModeScreenProps) {
  const [copied, setCopied] = useState(false);

  async function copyRawData(): Promise<void> {
    try {
      await navigator.clipboard.writeText(rawSnapshot);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-[440px] rounded-[16px] border border-[#E6D595] bg-[#FFFBEB] p-5 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-[8px] bg-[#FEF2F2] px-2.5 py-1 text-[13px] font-semibold text-[var(--danger)]">
          <AlertTriangleIcon className="w-4 h-4" />
          <span>Mode Pemulihan Data (Safe Mode)</span>
        </div>

        <h1 className="mt-3 mb-2 text-[19px] font-semibold text-[var(--ink-primary)]">
          Data penyimpanan lokal terdeteksi rusak
        </h1>
        <p className="m-0 text-[14px] leading-relaxed text-[var(--ink-secondary)]">
          Alasan: {reason} Data mentah Anda telah diamankan agar tidak tertimpa otomatis. Anda dapat menyalin teks mentahnya sebelum mereset aplikasi.
        </p>

        <textarea
          readOnly
          rows={4}
          aria-label="Data mentah penyimpanan lokal"
          value={rawSnapshot}
          className="mt-3 w-full rounded-[10px] border border-[#D6CFC2] bg-white p-2.5 font-mono text-[12px] text-[var(--ink-secondary)]"
        />

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void copyRawData()}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#D6CFC2] bg-white px-4 text-[14px] font-medium text-[var(--ink-primary)]"
          >
            <CopyIcon className="w-4 h-4" />
            <span>
              {copied ? 'Data Mentah Disalin' : 'Salin Data Mentah'}
            </span>
          </button>

          <button
            type="button"
            onClick={onResetSafeMode}
            className="min-h-[48px] w-full rounded-[10px] bg-[var(--accent-primary)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
          >
            Reset Safe Mode
          </button>
        </div>
      </section>
    </main>
  );
}
