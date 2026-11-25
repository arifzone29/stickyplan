import type { ComponentType } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ActivityFormSheet } from './components/ActivityFormSheet';
import { BottomThumbBar } from './components/BottomThumbBar';
import { DatePillStrip } from './components/DatePillStrip';
import { SafeModeScreen } from './components/SafeModeScreen';
import { StickySheetCard } from './components/StickySheetCard';
import { TopBar } from './components/TopBar';
import { getLocalDateString, resolveInitialDaySheetId } from './domain/dateUtils';
import { sortDaySheets, sortItineraryItems } from './domain/sorting';
import type {
  ActivityInputDto,
  DaySheetInputDto,
  DaySheetRecord,
  ImportMode,
  ItineraryItemRecord,
  StickyPlanStoreV1,
  ValidationError,
} from './domain/types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  createLocalStorageRepository,
  type BootState,
  type ItineraryRepository,
} from './storage/repository';

interface LazyDataManageProps {
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

export interface AppProps {
  repository?: ItineraryRepository;
  getTodayLocal?: () => string;
}

export function App({ repository, getTodayLocal }: AppProps = {}) {
  const repo = useMemo(
    () => repository ?? createLocalStorageRepository({ getTodayLocal }),
    [repository, getTodayLocal],
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

  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItemRecord | null>(
    null,
  );
  const [isDataManageOpen, setIsDataManageOpen] = useState(false);
  const [DataManageComponent, setDataManageComponent] =
    useState<ComponentType<LazyDataManageProps> | null>(null);
  const [storageBannerError, setStorageBannerError] = useState<string | null>(
    null,
  );

  const isOnline = useOnlineStatus();

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
          const res = repo.resetSafeMode();
          if (!res.ok) {
            setStorageBannerError(res.error.message);
            return;
          }
          setBootState({ status: 'ready', store: res.data });
          setActiveSheetId(
            resolveInitialDaySheetId(res.data.day_sheets, todayLocal),
          );
        }}
      />
    );
  }

  const store = bootState.store;
  const activeTrip =
    store.trips.find((t) => t.id === store.active_trip_id) ?? store.trips[0];

  const sortedSheets = sortDaySheets(
    store.day_sheets.filter((s) => s.trip_id === store.active_trip_id),
  );

  const resolvedIndex = sortedSheets.findIndex((s) => s.id === activeSheetId);
  const currentIndex =
    resolvedIndex !== -1 ? resolvedIndex : sortedSheets.length > 0 ? 0 : -1;
  const currentSheet =
    currentIndex >= 0 ? (sortedSheets[currentIndex] ?? null) : null;

  const activeItems = currentSheet
    ? sortItineraryItems(
        store.itinerary_items.filter(
          (item) => item.day_sheet_id === currentSheet.id,
        ),
      )
    : [];

  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < sortedSheets.length - 1;

  function commitStore(nextStore: StickyPlanStoreV1): void {
    setStorageBannerError(null);
    setBootState({ status: 'ready', store: nextStore });
  }

  function handleSaveTripTitle(newTitle: string): string | null {
    const res = repo.updateTripTitle(store, newTitle);
    if (!res.ok) {
      if (res.error.code === 'QUOTA_EXCEEDED') {
        setStorageBannerError(res.error.message);
      }
      return res.error.message;
    }
    commitStore(res.data);
    return null;
  }

  function handleAddSheet(dto: DaySheetInputDto): string | null {
    const res = repo.addDaySheet(store, dto);
    if (!res.ok) {
      if (res.error.code === 'QUOTA_EXCEEDED') {
        setStorageBannerError(res.error.message);
      }
      return res.error.message;
    }
    const added = res.data.day_sheets.find(
      (s) => s.trip_id === res.data.active_trip_id && s.date === dto.date,
    );
    commitStore(res.data);
    if (added) {
      setActiveSheetId(added.id);
    }
    return null;
  }

  function handleSaveActivity(
    dto: ActivityInputDto,
    editingId: string | null,
  ): ValidationError | null {
    if (!currentSheet) {
      return {
        code: 'NO_ACTIVE_SHEET',
        message: 'Pilih atau tambahkan tanggal terlebih dahulu.',
      };
    }

    if (editingId) {
      const res = repo.updateActivity(store, editingId, dto);
      if (!res.ok) {
        if (res.error.code === 'QUOTA_EXCEEDED') {
          setStorageBannerError(res.error.message);
        }
        return res.error;
      }
      commitStore(res.data);
      return null;
    }

    const res = repo.addActivity(store, currentSheet.id, dto);
    if (!res.ok) {
      if (res.error.code === 'QUOTA_EXCEEDED') {
        setStorageBannerError(res.error.message);
      }
      return res.error;
    }
    commitStore(res.data.store);
    return null;
  }

  function handleDeleteActivity(itemId: string): ValidationError | null {
    const res = repo.deleteActivity(store, itemId);
    if (!res.ok) return res.error;
    commitStore(res.data);
    return null;
  }

  function handleDeleteSheet(sheetId: string): ValidationError | null {
    const res = repo.deleteDaySheet(store, sheetId);
    if (!res.ok) return res.error;
    const remaining = sortDaySheets(
      res.data.day_sheets.filter((s) => s.trip_id === res.data.active_trip_id),
    );
    commitStore(res.data);
    setActiveSheetId(resolveInitialDaySheetId(remaining, todayLocal));
    return null;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar
        tripTitle={activeTrip?.title ?? 'Itinerary Saya'}
        isOnline={isOnline}
        hasNeverExported={
          store.last_exported_at === null && store.itinerary_items.length > 0
        }
        onSaveTripTitle={handleSaveTripTitle}
        onOpenDataManage={() => setIsDataManageOpen(true)}
      />

      {storageBannerError && (
        <div
          role="alert"
          className="mx-auto mb-2 w-full max-w-[460px] px-3"
        >
          <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-[13.5px] font-medium text-[var(--danger)]">
            {storageBannerError}
          </div>
        </div>
      )}

      <DatePillStrip
        sheets={sortedSheets}
        activeSheetId={currentSheet?.id ?? null}
        todayLocal={todayLocal}
        onSelectSheet={(id) => setActiveSheetId(id)}
        onAddSheet={handleAddSheet}
      />

      <StickySheetCard
        sheet={currentSheet}
        sheetIndex={currentIndex}
        totalSheets={sortedSheets.length}
        todayLocal={todayLocal}
        items={activeItems}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={() => {
          if (canPrev) {
            const prevSheet = sortedSheets[currentIndex - 1];
            if (prevSheet) setActiveSheetId(prevSheet.id);
          }
        }}
        onNext={() => {
          if (canNext) {
            const nextSheet = sortedSheets[currentIndex + 1];
            if (nextSheet) setActiveSheetId(nextSheet.id);
          }
        }}
        onAddActivity={() => {
          setEditingItem(null);
          setIsActivityFormOpen(true);
        }}
        onEditActivity={(item) => {
          setEditingItem(item);
          setIsActivityFormOpen(true);
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
            const prevSheet = sortedSheets[currentIndex - 1];
            if (prevSheet) setActiveSheetId(prevSheet.id);
          }
        }}
        onNext={() => {
          if (canNext) {
            const nextSheet = sortedSheets[currentIndex + 1];
            if (nextSheet) setActiveSheetId(nextSheet.id);
          }
        }}
        onAddActivity={() => {
          setEditingItem(null);
          setIsActivityFormOpen(true);
        }}
      />

      <ActivityFormSheet
        isOpen={isActivityFormOpen}
        editingItem={editingItem}
        onClose={() => {
          setIsActivityFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
      />

      {isDataManageOpen && DataManageComponent && (
        <DataManageComponent
          isOpen={isDataManageOpen}
          store={store}
          activeSheet={currentSheet}
          activeSheetItemCount={activeItems.length}
          onClose={() => setIsDataManageOpen(false)}
          onMarkExported={() => {
            const res = repo.markExported(store);
            if (res.ok) commitStore(res.data);
          }}
          onImportJson={(jsonText, byteLength, mode) => {
            const res = repo.importFromJson(store, jsonText, byteLength, mode);
            if (!res.ok) return res.error;
            commitStore(res.data);
            setActiveSheetId(
              resolveInitialDaySheetId(res.data.day_sheets, todayLocal),
            );
            return null;
          }}
          onDeleteActiveSheet={handleDeleteSheet}
        />
      )}
    </div>
  );
}
