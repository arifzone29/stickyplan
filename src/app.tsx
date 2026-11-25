import type { ComponentType } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { ActivityFormSheet } from './components/ActivityFormSheet';
import { BottomThumbBar } from './components/BottomThumbBar';
import { ConfirmModal } from './components/ConfirmModal';
import type { DataManageSheetProps } from './components/DataManageSheet';
import { DatePillStrip } from './components/DatePillStrip';
import { SafeModeScreen } from './components/SafeModeScreen';
import { StickySheetCard } from './components/StickySheetCard';
import { ToastRegion, type ToastMessage } from './components/Toast';
import { TopBar } from './components/TopBar';
import {
  formatDateHeaderId,
  getLocalDateString,
  resolveInitialDaySheetId,
} from './domain/dateUtils';
import { sortDaySheets } from './domain/sorting';
import { formatDaySheetAsPlainText } from './domain/textFormatter';
import type {
  ActivityInputDto,
  DaySheet,
  DaySheetInputDto,
  ItineraryItem,
  NoteColor,
  StickyPlanStoreV1,
  ValidationError,
} from './domain/types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  createLocalStorageRepository,
  type BootState,
  type ItineraryRepository,
} from './storage/repository';

export interface AppProps {
  repository?: ItineraryRepository;
  getTodayLocal?: () => string;
}

type PendingConfirmation =
  | { kind: 'delete-item'; sheetId: string; item: ItineraryItem }
  | { kind: 'delete-sheet'; sheet: DaySheet }
  | { kind: 'reset-default' };

export function App({ repository, getTodayLocal }: AppProps = {}) {
  const repo = useMemo(
    () => repository ?? createLocalStorageRepository(),
    [repository],
  );
  const todayLocal = useMemo(
    () => (getTodayLocal ? getTodayLocal() : getLocalDateString()),
    [getTodayLocal],
  );

  const [bootState, setBootState] = useState<BootState>(() =>
    repo.loadOrInitialize(),
  );
  const [activeSheetId, setActiveSheetId] = useState<string | null>(() =>
    bootState.status === 'ready'
      ? resolveInitialDaySheetId(bootState.store.day_sheets, todayLocal)
      : null,
  );
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [isDataManageOpen, setIsDataManageOpen] = useState(false);
  const [DataManageComponent, setDataManageComponent] =
    useState<ComponentType<DataManageSheetProps> | null>(null);

  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmation | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const isOnline = useOnlineStatus();

  const showToast = useCallback(
    (text: string, variant: 'info' | 'error' = 'info') => {
      setToast({ id: Date.now(), text, variant });
    },
    [],
  );

  useEffect(() => {
    if (!isDataManageOpen || DataManageComponent) return;
    let mounted = true;
    void import('./components/DataManageSheet').then((mod) => {
      if (mounted) {
        setDataManageComponent(() => mod.default);
      }
    });
    return () => {
      mounted = false;
    };
  }, [isDataManageOpen, DataManageComponent]);

  if (bootState.status === 'corrupt') {
    return (
      <SafeModeScreen
        rawSnapshot={bootState.rawSnapshot}
        reason={bootState.reason}
        onResetSafeMode={() => {
          const res = repo.resetToDefaultSeed();
          if (!res.ok) return;
          setBootState({ status: 'ready', store: res.data });
          setActiveSheetId(
            resolveInitialDaySheetId(res.data.day_sheets, todayLocal),
          );
          showToast('Data berhasil dipulihkan ke jadwal awal');
        }}
      />
    );
  }

  const store = bootState.store;
  const sortedSheets = sortDaySheets(store.day_sheets);
  const resolvedIndex = sortedSheets.findIndex((s) => s.id === activeSheetId);
  const currentIndex =
    resolvedIndex !== -1 ? resolvedIndex : sortedSheets.length > 0 ? 0 : -1;
  const currentSheet =
    currentIndex >= 0 ? (sortedSheets[currentIndex] ?? null) : null;

  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < sortedSheets.length - 1;
  const isAnyModalOpen =
    isActivityFormOpen || isDataManageOpen || pendingConfirm !== null;

  function commitStore(nextStore: StickyPlanStoreV1): void {
    setBootState({ status: 'ready', store: nextStore });
  }

  function handleSaveTripTitle(newTitle: string): string | null {
    const res = repo.updateTripTitle(store, newTitle);
    if (!res.ok) {
      if (res.error.code === 'QUOTA_EXCEEDED') {
        showToast(res.error.message, 'error');
      }
      return res.error.message;
    }
    commitStore(res.data);
    showToast('Judul perjalanan diperbarui');
    return null;
  }

  function handleAddSheet(dto: DaySheetInputDto): string | null {
    const res = repo.addOrSelectDaySheet(store, dto);
    if (!res.ok) {
      if (res.error.code === 'QUOTA_EXCEEDED') {
        showToast(res.error.message, 'error');
      }
      return res.error.message;
    }
    commitStore(res.data.store);
    setActiveSheetId(res.data.sheetId);
    setOpenItemId(null);
    showToast(
      res.data.alreadyExisted
        ? 'Berpindah ke tanggal yang sudah terdaftar'
        : 'Lembar tanggal baru ditambahkan',
    );
    return null;
  }

  function handleSaveSingleActivity(
    dto: ActivityInputDto,
    editingId: string | null,
  ): ValidationError | null {
    if (!currentSheet) {
      return {
        code: 'NO_ACTIVE_SHEET',
        message: 'Tambahkan lembar tanggal terlebih dahulu.',
      };
    }

    if (editingId) {
      const res = repo.updateActivity(store, currentSheet.id, editingId, dto);
      if (!res.ok) return res.error;
      commitStore(res.data);
      showToast('Kegiatan diperbarui');
      return null;
    }

    const res = repo.addActivity(store, currentSheet.id, dto);
    if (!res.ok) return res.error;
    commitStore(res.data.store);
    showToast('Kegiatan ditambahkan');
    return null;
  }

  function handleSaveBulkActivities(
    rawBulkText: string,
  ): ValidationError | null {
    if (!currentSheet) {
      return {
        code: 'NO_ACTIVE_SHEET',
        message: 'Tambahkan lembar tanggal terlebih dahulu.',
      };
    }
    const res = repo.addBulkActivities(store, currentSheet.id, rawBulkText);
    if (!res.ok) return res.error;
    commitStore(res.data.store);
    showToast(`${res.data.addedCount} kegiatan berhasil ditambahkan`);
    return null;
  }

  async function handleCopyActiveDay(): Promise<void> {
    if (!currentSheet) return;
    try {
      await navigator.clipboard.writeText(
        formatDaySheetAsPlainText(currentSheet),
      );
      showToast('Jadwal hari ini disalin ke clipboard');
    } catch {
      showToast('Gagal menyalin otomatis', 'error');
    }
  }

  function executeConfirmedAction(): void {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);

    if (action.kind === 'delete-item') {
      const res = repo.deleteActivity(store, action.sheetId, action.item.id);
      if (!res.ok) {
        showToast(res.error.message, 'error');
        return;
      }
      if (openItemId === action.item.id) setOpenItemId(null);
      commitStore(res.data);
      showToast('Kegiatan dihapus');
      return;
    }

    if (action.kind === 'delete-sheet') {
      const res = repo.deleteDaySheet(store, action.sheet.id);
      if (!res.ok) {
        showToast(res.error.message, 'error');
        return;
      }
      commitStore(res.data);
      setOpenItemId(null);
      setActiveSheetId(
        resolveInitialDaySheetId(res.data.day_sheets, todayLocal),
      );
      showToast('Lembar tanggal dihapus');
      return;
    }

    if (action.kind === 'reset-default') {
      const res = repo.resetToDefaultSeed();
      if (!res.ok) {
        showToast(res.error.message, 'error');
        return;
      }
      commitStore(res.data);
      setOpenItemId(null);
      setActiveSheetId(
        resolveInitialDaySheetId(res.data.day_sheets, todayLocal),
      );
      showToast('Dikembalikan ke jadwal awal Audit ANTARA Lampung');
    }
  }

  const confirmDialogMeta = useMemo(() => {
    if (!pendingConfirm) return null;
    if (pendingConfirm.kind === 'delete-item') {
      return {
        title: 'Hapus Kegiatan?',
        message: `Kegiatan "${pendingConfirm.item.title}" (${pendingConfirm.item.start_time}) akan dihapus dari jadwal hari ini.`,
        confirmLabel: 'Ya, Hapus',
      };
    }
    if (pendingConfirm.kind === 'delete-sheet') {
      const count = pendingConfirm.sheet.items.length;
      return {
        title: 'Hapus Lembar Tanggal?',
        message: `Tanggal ${formatDateHeaderId(pendingConfirm.sheet.date)} beserta ${count} kegiatan di dalamnya akan dihapus permanen.`,
        confirmLabel: 'Ya, Hapus',
      };
    }
    return {
      title: 'Reset ke Jadwal Awal?',
      message:
        'Seluruh perubahan lokal akan dikembalikan ke rundown awal Audit Perum LKBN ANTARA Biro Lampung. Pastikan Anda sudah Export JSON jika perlu.',
      confirmLabel: 'Ya, Reset',
    };
  }, [pendingConfirm]);

  return (
    <div className="min-h-dvh bg-stone-100">
      <ToastRegion
        toast={toast}
        isModalOpen={isAnyModalOpen}
        onDismiss={() => setToast(null)}
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-stone-50 pb-24 shadow-xl shadow-stone-300/60 relative">
        <TopBar
          tripTitle={store.trip.title}
          isOnline={isOnline}
          hasNeverExported={
            !store.last_exported_at &&
            store.day_sheets.some((s) => s.items.length > 0)
          }
          onSaveTripTitle={handleSaveTripTitle}
          onOpenDataManage={() => setIsDataManageOpen(true)}
        />

        <DatePillStrip
          sheets={sortedSheets}
          activeSheetId={currentSheet?.id ?? null}
          todayLocal={todayLocal}
          onSelectSheet={(id) => {
            setActiveSheetId(id);
            setOpenItemId(null);
          }}
          onAddSheet={handleAddSheet}
        />

        <StickySheetCard
          sheet={currentSheet}
          sheetIndex={currentIndex}
          totalSheets={sortedSheets.length}
          todayLocal={todayLocal}
          openItemId={openItemId}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => {
            if (canPrev) {
              const prev = sortedSheets[currentIndex - 1];
              if (prev) {
                setActiveSheetId(prev.id);
                setOpenItemId(null);
              }
            }
          }}
          onNext={() => {
            if (canNext) {
              const next = sortedSheets[currentIndex + 1];
              if (next) {
                setActiveSheetId(next.id);
                setOpenItemId(null);
              }
            }
          }}
          onToggleItem={(itemId) =>
            setOpenItemId((prev) => (prev === itemId ? null : itemId))
          }
          onChangeColor={(color: NoteColor) => {
            if (!currentSheet) return;
            const res = repo.updateDaySheetMeta(store, currentSheet.id, {
              note_color: color,
            });
            if (res.ok) commitStore(res.data);
          }}
          onSaveSummary={(summary) => {
            if (!currentSheet) return;
            const res = repo.updateDaySheetMeta(store, currentSheet.id, {
              day_summary: summary,
            });
            if (res.ok) {
              commitStore(res.data);
              showToast('Ringkasan hari disimpan');
            }
          }}
          onSortByTime={() => {
            if (!currentSheet) return;
            const res = repo.sortSheetByTime(store, currentSheet.id);
            if (res.ok) {
              commitStore(res.data);
              showToast('Jadwal diurutkan berdasarkan jam');
            }
          }}
          onCopyDayText={() => void handleCopyActiveDay()}
          onReorderItem={(fromIdx, toIdx) => {
            if (!currentSheet) return;
            const res = repo.reorderActivities(
              store,
              currentSheet.id,
              fromIdx,
              toIdx,
            );
            if (res.ok) commitStore(res.data);
          }}
          onAddActivity={() => {
            setEditingItem(null);
            setIsActivityFormOpen(true);
          }}
          onEditActivity={(item) => {
            setEditingItem(item);
            setIsActivityFormOpen(true);
          }}
          onDeleteActivity={(item) => {
            if (!currentSheet) return;
            setPendingConfirm({
              kind: 'delete-item',
              sheetId: currentSheet.id,
              item,
            });
          }}
          onAddFirstDate={() => {
            handleAddSheet({
              date: todayLocal,
              note_color: 'warm-yellow',
              day_summary: null,
            });
          }}
        />

        <BottomThumbBar
          canPrev={canPrev}
          canNext={canNext}
          hasActiveSheet={currentSheet !== null}
          onPrev={() => {
            if (canPrev) {
              const prev = sortedSheets[currentIndex - 1];
              if (prev) {
                setActiveSheetId(prev.id);
                setOpenItemId(null);
              }
            }
          }}
          onNext={() => {
            if (canNext) {
              const next = sortedSheets[currentIndex + 1];
              if (next) {
                setActiveSheetId(next.id);
                setOpenItemId(null);
              }
            }
          }}
          onAddActivity={() => {
            setEditingItem(null);
            setIsActivityFormOpen(true);
          }}
        />
      </div>

      <ActivityFormSheet
        isOpen={isActivityFormOpen}
        editingItem={editingItem}
        onClose={() => {
          setIsActivityFormOpen(false);
          setEditingItem(null);
        }}
        onSaveSingle={handleSaveSingleActivity}
        onSaveBulk={handleSaveBulkActivities}
        onRequestDelete={(item) => {
          if (!currentSheet) return;
          setPendingConfirm({
            kind: 'delete-item',
            sheetId: currentSheet.id,
            item,
          });
        }}
      />

      {isDataManageOpen && DataManageComponent && (
        <DataManageComponent
          isOpen={isDataManageOpen}
          store={store}
          activeSheet={currentSheet}
          onClose={() => setIsDataManageOpen(false)}
          onMarkExported={() => {
            const res = repo.markExported(store);
            if (res.ok) commitStore(res.data);
          }}
          onImportJson={(jsonText, byteLength, mode) => {
            const res = repo.importFromJson(store, jsonText, byteLength, mode);
            if (!res.ok) return res.error;
            commitStore(res.data);
            setOpenItemId(null);
            setActiveSheetId(
              resolveInitialDaySheetId(res.data.day_sheets, todayLocal),
            );
            return null;
          }}
          onRequestDeleteSheet={(sheet) =>
            setPendingConfirm({ kind: 'delete-sheet', sheet })
          }
          onRequestResetDefault={() =>
            setPendingConfirm({ kind: 'reset-default' })
          }
          onNotify={showToast}
        />
      )}

      <ConfirmModal
        isOpen={pendingConfirm !== null}
        title={confirmDialogMeta?.title ?? ''}
        message={confirmDialogMeta?.message ?? ''}
        confirmLabel={confirmDialogMeta?.confirmLabel}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={executeConfirmedAction}
      />
    </div>
  );
}
