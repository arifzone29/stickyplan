import { useState } from 'preact/hooks';
import { formatDateHeaderId, getLocalDateString } from '../domain/dateUtils';
import { formatTripAsPlainText } from '../domain/textFormatter';
import type {
  DaySheet,
  ImportMode,
  StickyPlanStoreV1,
  ValidationError,
} from '../domain/types';
import { parseAndValidateImportJson } from '../domain/validators';
import {
  CopyIcon,
  DownloadIcon,
  RotateCcwIcon,
  TrashIcon,
  UploadIcon,
} from './Icons';
import { ModalSheet } from './ModalSheet';

export interface DataManageSheetProps {
  isOpen: boolean;
  store: StickyPlanStoreV1;
  activeSheet: DaySheet | null;
  onClose: () => void;
  onMarkExported: () => void;
  onImportJson: (
    jsonText: string,
    byteLength: number,
    mode: ImportMode,
  ) => ValidationError | null;
  onRequestDeleteSheet: (sheet: DaySheet) => void;
  onRequestResetDefault: () => void;
  onNotify: (text: string, variant?: 'info' | 'error') => void;
}

function formatBackupTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Belum pernah';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Belum pernah';
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DataManageSheet({
  isOpen,
  store,
  activeSheet,
  onClose,
  onMarkExported,
  onImportJson,
  onRequestDeleteSheet,
  onRequestResetDefault,
  onNotify,
}: DataManageSheetProps) {
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    jsonText: string;
    byteLength: number;
  } | null>(null);

  function triggerExportDownload(): void {
    setErrorNotice(null);
    const payload = JSON.stringify(
      {
        ...store,
        last_exported_at: new Date().toISOString(),
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stickyplan-${getLocalDateString()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    onMarkExported();
    onClose();
    onNotify('File backup JSON berhasil diunduh');
  }

  async function handleCopyAllText(): Promise<void> {
    setErrorNotice(null);
    const formatted = formatTripAsPlainText(store);
    try {
      await navigator.clipboard.writeText(formatted);
      onClose();
      onNotify('Seluruh jadwal berhasil disalin ke clipboard');
    } catch {
      setErrorNotice('Gagal menyalin otomatis. Izinkan akses clipboard browser.');
    }
  }

  async function handleFileSelected(event: Event): Promise<void> {
    setErrorNotice(null);
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const text = await file.text();
    const precheck = parseAndValidateImportJson(text, file.size);
    if (!precheck.ok) {
      setPendingImport(null);
      setErrorNotice(precheck.error.message);
      return;
    }

    const hasExistingItems = store.day_sheets.some((s) => s.items.length > 0);
    if (!hasExistingItems) {
      const err = onImportJson(text, file.size, 'replace');
      if (err) {
        setErrorNotice(err.message);
        return;
      }
      onClose();
      onNotify('Backup JSON berhasil dipulihkan');
      return;
    }

    setPendingImport({
      fileName: file.name,
      jsonText: text,
      byteLength: file.size,
    });
  }

  function executeImport(mode: ImportMode): void {
    if (!pendingImport) return;
    const err = onImportJson(
      pendingImport.jsonText,
      pendingImport.byteLength,
      mode,
    );
    if (err) {
      setErrorNotice(err.message);
      return;
    }
    setPendingImport(null);
    onClose();
    onNotify(
      mode === 'merge'
        ? 'Jadwal dari file berhasil digabungkan'
        : 'Seluruh jadwal diganti dari file backup',
    );
  }

  return (
    <ModalSheet
      isOpen={isOpen}
      title="Kelola Data & Backup"
      onClose={() => {
        setPendingImport(null);
        setErrorNotice(null);
        onClose();
      }}
    >
      <div className="flex flex-col gap-3.5">
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3">
          <p className="m-0 text-xs font-bold text-stone-900">
            Terakhir di-backup: {formatBackupTimestamp(store.last_exported_at)}
          </p>
          <p className="mt-1 mb-0 text-[11px] leading-relaxed text-stone-600">
            Seluruh jadwal tersimpan lokal untuk akses mode pesawat. Export JSON secara berkala sebagai cadangan.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={triggerExportDownload}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-xs font-bold text-white hover:bg-stone-800 active:scale-[0.99] transition-transform"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Export Backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyAllText()}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-800 hover:bg-stone-100"
          >
            <CopyIcon className="w-4 h-4" />
            <span>Salin Seluruh Jadwal (Teks WA)</span>
          </button>

          <div>
            <label
              htmlFor="import-json-input"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-800 cursor-pointer hover:bg-stone-100"
            >
              <UploadIcon className="w-4 h-4" />
              <span>Import File Backup (.json)</span>
            </label>
            <input
              id="import-json-input"
              name="backup_json"
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handleFileSelected(e)}
              className="sr-only"
            />
          </div>
        </div>

        {pendingImport && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex flex-col gap-2">
            <p className="m-0 text-xs font-bold text-stone-900">
              File "{pendingImport.fileName}" valid. Pilih metode pemulihan:
            </p>
            <button
              type="button"
              onClick={() => executeImport('merge')}
              className="min-h-[42px] rounded-xl bg-stone-900 px-3 text-xs font-bold text-white"
            >
              Gabungkan dengan Jadwal Saat Ini
            </button>
            <button
              type="button"
              onClick={() => executeImport('replace')}
              className="min-h-[42px] rounded-xl border border-red-300 bg-white px-3 text-xs font-bold text-red-700"
            >
              Ganti Semua Data Lokal
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="min-h-[38px] rounded-xl bg-transparent px-3 text-xs font-medium text-stone-600"
            >
              Batal
            </button>
          </div>
        )}

        {errorNotice && (
          <p
            role="alert"
            className="m-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
          >
            {errorNotice}
          </p>
        )}

        <div className="border-t border-stone-200 pt-3 flex flex-col gap-2">
          {activeSheet && (
            <button
              type="button"
              onClick={() => {
                const target = activeSheet;
                onClose();
                onRequestDeleteSheet(target);
              }}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>
                Hapus Tanggal Aktif ({formatDateHeaderId(activeSheet.date)})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestResetDefault();
            }}
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 text-xs font-bold text-stone-700 hover:bg-stone-200"
          >
            <RotateCcwIcon className="w-3.5 h-3.5" />
            <span>Reset ke Jadwal Awal Lampung</span>
          </button>
        </div>
      </div>
    </ModalSheet>
  );
}
