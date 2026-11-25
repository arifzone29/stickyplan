import { useRef, useState } from 'preact/hooks';
import { formatDateHeaderId, getLocalDateString } from '../domain/dateUtils';
import { formatTripAsPlainText } from '../domain/textFormatter';
import type {
  DaySheetRecord,
  ImportMode,
  StickyPlanStoreV1,
  ValidationError,
} from '../domain/types';
import { parseAndValidateImportJson } from '../domain/validators';
import { CopyIcon, DownloadIcon, TrashIcon, UploadIcon } from './Icons';
import { ModalSheet } from './ModalSheet';

interface DataManageSheetProps {
  isOpen: boolean;
  store: StickyPlanStoreV1;
  activeSheet: DaySheetRecord | null;
  activeSheetItemCount: number;
  onClose: () => void;
  onMarkExported: () => void;
  onImportJson: (
    jsonText: string,
    byteLength: number,
    mode: ImportMode,
  ) => ValidationError | null;
  onDeleteActiveSheet: (sheetId: string) => ValidationError | null;
}

function formatBackupTimestamp(iso: string | null): string {
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
  activeSheetItemCount,
  onClose,
  onMarkExported,
  onImportJson,
  onDeleteActiveSheet,
}: DataManageSheetProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    jsonText: string;
    byteLength: number;
  } | null>(null);
  const [isConfirmingDeleteDate, setIsConfirmingDeleteDate] = useState(false);

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
    anchor.download = `stickyplan-backup-${getLocalDateString()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    onMarkExported();
    setStatusNotice('File backup JSON berhasil diunduh.');
  }

  async function handleCopyPlainText(): Promise<void> {
    setErrorNotice(null);
    const formatted = formatTripAsPlainText(store);
    try {
      await navigator.clipboard.writeText(formatted);
      setStatusNotice('Teks jadwal siap tempel ke WhatsApp berhasil disalin.');
    } catch {
      setErrorNotice(
        'Gagal menyalin otomatis. Izinkan akses clipboard pada browser Anda.',
      );
    }
  }

  async function handleFileSelected(event: Event): Promise<void> {
    setErrorNotice(null);
    setStatusNotice(null);
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

    const hasExistingData = store.itinerary_items.length > 0;
    if (!hasExistingData) {
      const err = onImportJson(text, file.size, 'replace');
      if (err) {
        setErrorNotice(err.message);
        return;
      }
      setStatusNotice('Data jadwal berhasil dipulihkan dari file JSON.');
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
    setStatusNotice(
      mode === 'merge'
        ? 'Jadwal dari file berhasil digabungkan.'
        : 'Seluruh jadwal berhasil diganti dari file backup.',
    );
  }

  function confirmDeleteSheet(): void {
    if (!activeSheet) return;
    const err = onDeleteActiveSheet(activeSheet.id);
    if (err) {
      setErrorNotice(err.message);
      return;
    }
    setIsConfirmingDeleteDate(false);
    onClose();
  }

  return (
    <ModalSheet
      isOpen={isOpen}
      title="Kelola Data & Tanggal"
      onClose={() => {
        setPendingImport(null);
        setIsConfirmingDeleteDate(false);
        setErrorNotice(null);
        setStatusNotice(null);
        onClose();
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[12px] border border-[#E2DDD2] bg-[#F7F4EC] px-3.5 py-3">
          <p className="m-0 text-[13.5px] font-medium text-[var(--ink-primary)]">
            Terakhir di-backup: {formatBackupTimestamp(store.last_exported_at)}
          </p>
          <p className="mt-1 mb-0 text-[12.5px] text-[var(--ink-secondary)]">
            Data disimpan lokal di perangkat ini. Unduh JSON atau salin teks secara berkala agar aman saat ganti HP.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={triggerExportDownload}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--accent-primary)] px-4 text-[15px] font-semibold text-white hover:bg-[var(--accent-primary-hover)]"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Unduh Backup JSON (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyPlainText()}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#D6CFC2] bg-white px-4 text-[14.5px] font-medium text-[var(--ink-primary)] hover:bg-[#F4F0E8]"
          >
            <CopyIcon className="w-4 h-4" />
            <span>Salin Teks Jadwal (Format WhatsApp)</span>
          </button>

          <div>
            <label
              htmlFor="import-json-input"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#D6CFC2] bg-white px-4 text-[14.5px] font-medium text-[var(--ink-primary)] cursor-pointer hover:bg-[#F4F0E8]"
            >
              <UploadIcon className="w-4 h-4" />
              <span>Impor File Backup (.json)</span>
            </label>
            <input
              ref={fileInputRef}
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
          <div className="rounded-[12px] border border-[#F59E0B] bg-[#FFFBEB] p-3.5 flex flex-col gap-2.5">
            <p className="m-0 text-[14px] font-semibold text-[var(--ink-primary)]">
              File "{pendingImport.fileName}" valid. Pilih cara pemulihan:
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => executeImport('merge')}
                className="min-h-[44px] rounded-[10px] bg-[var(--accent-primary)] px-3 text-[14px] font-semibold text-white"
              >
                Gabungkan dengan Jadwal Saat Ini
              </button>
              <button
                type="button"
                onClick={() => executeImport('replace')}
                className="min-h-[44px] rounded-[10px] border border-[#B91C1C] bg-white px-3 text-[14px] font-medium text-[var(--danger)]"
              >
                Ganti Semua Data Lokal
              </button>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="min-h-[44px] rounded-[10px] border border-[#D6CFC2] bg-transparent px-3 text-[13.5px] text-[var(--ink-secondary)]"
              >
                Batalkan Impor
              </button>
            </div>
          </div>
        )}

        {statusNotice && (
          <p
            role="status"
            className="m-0 rounded-[10px] border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-[13.5px] font-medium text-[#065F46]"
          >
            {statusNotice}
          </p>
        )}

        {errorNotice && (
          <p
            role="alert"
            className="m-0 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13.5px] font-medium text-[var(--danger)]"
          >
            {errorNotice}
          </p>
        )}

        {activeSheet && (
          <div className="border-t border-[#E7E2D8] pt-3.5">
            <p className="m-0 mb-2 text-[13px] font-medium text-[var(--ink-secondary)]">
              Lembar aktif: {formatDateHeaderId(activeSheet.date)}
            </p>
            {!isConfirmingDeleteDate ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDeleteDate(true)}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 text-[14px] font-medium text-[var(--danger)]"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Hapus Lembar Tanggal Ini</span>
              </button>
            ) : (
              <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] p-3 flex flex-col gap-2">
                <p className="m-0 text-[13.5px] font-medium text-[var(--danger)]">
                  Hapus {formatDateHeaderId(activeSheet.date)} beserta{' '}
                  {activeSheetItemCount} kegiatan di dalamnya?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDeleteDate(false)}
                    className="min-h-[44px] flex-1 rounded-[10px] border border-[#D6CFC2] bg-white px-3 text-[14px] font-medium text-[var(--ink-primary)]"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteSheet}
                    className="min-h-[44px] flex-1 rounded-[10px] bg-[var(--danger)] px-3 text-[14px] font-semibold text-white"
                  >
                    Yakin Hapus Tanggal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalSheet>
  );
}
