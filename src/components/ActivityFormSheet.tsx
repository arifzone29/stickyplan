import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { parseBulkInputText } from '../domain/bulkParser';
import { parseSmartMapsInput } from '../domain/mapsUrl';
import {
  MAX_ACTIVITY_DESCRIPTION_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH,
  type ActivityInputDto,
  type ItineraryItem,
  type ValidationError,
} from '../domain/types';
import { FileTextIcon, MapPinIcon, TrashIcon } from './Icons';
import { ModalSheet } from './ModalSheet';

interface ActivityFormSheetProps {
  isOpen: boolean;
  editingItem: ItineraryItem | null;
  onClose: () => void;
  onSaveSingle: (
    rawInput: ActivityInputDto,
    editingId: string | null,
  ) => ValidationError | null;
  onSaveBulk: (rawBulkText: string) => ValidationError | null;
  onRequestDelete?: (item: ItineraryItem) => void;
}

export function ActivityFormSheet({
  isOpen,
  editingItem,
  onClose,
  onSaveSingle,
  onSaveBulk,
  onRequestDelete,
}: ActivityFormSheetProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [startTime, setStartTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mapsRaw, setMapsRaw] = useState('');
  const [mapsTouched, setMapsTouched] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [formError, setFormError] = useState<ValidationError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const mapsRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('single');
    if (editingItem) {
      setStartTime(editingItem.start_time);
      setTitle(editingItem.title);
      setDescription(editingItem.description ?? '');
      setMapsRaw(editingItem.maps_url ?? '');
    } else {
      setStartTime('09:00');
      setTitle('');
      setDescription('');
      setMapsRaw('');
      setBulkText('');
    }
    setMapsTouched(false);
    setFormError(null);
    setIsSubmitting(false);
  }, [isOpen, editingItem]);

  const mapsPreview = parseSmartMapsInput(mapsRaw);
  const bulkParsedItems = useMemo(
    () => (activeTab === 'bulk' ? parseBulkInputText(bulkText) : []),
    [activeTab, bulkText],
  );

  function focusFieldByError(field?: string): void {
    if (field === 'start_time') timeRef.current?.focus();
    else if (field === 'title') titleRef.current?.focus();
    else if (field === 'maps_url') mapsRef.current?.focus();
    else if (field === 'description') descRef.current?.focus();
  }

  function handleSingleSubmit(event: Event): void {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const error = onSaveSingle(
      {
        start_time: startTime,
        title,
        description: description.trim() ? description : null,
        maps_url: mapsRaw.trim() ? mapsRaw : null,
      },
      editingItem ? editingItem.id : null,
    );

    setIsSubmitting(false);
    if (error) {
      setFormError(error);
      focusFieldByError(error.field);
      return;
    }

    onClose();
  }

  function handleBulkSubmit(event: Event): void {
    event.preventDefault();
    if (isSubmitting || bulkParsedItems.length === 0) return;
    setIsSubmitting(true);

    const error = onSaveBulk(bulkText);
    setIsSubmitting(false);
    if (error) {
      setFormError(error);
      return;
    }

    onClose();
  }

  return (
    <ModalSheet
      isOpen={isOpen}
      title={editingItem ? 'Edit Kegiatan' : 'Tambah Kegiatan'}
      onClose={onClose}
    >
      {!editingItem && (
        <div
          role="tablist"
          aria-label="Metode input kegiatan"
          className="mb-4 flex items-center gap-1 rounded-xl bg-stone-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'single'}
            onClick={() => {
              setActiveTab('single');
              setFormError(null);
            }}
            className={`min-h-[38px] flex-1 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Satu Kegiatan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bulk'}
            onClick={() => {
              setActiveTab('bulk');
              setFormError(null);
            }}
            className={`inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'bulk'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            <span>Bulk Input</span>
          </button>
        </div>
      )}

      {activeTab === 'single' || editingItem ? (
        <form
          onSubmit={handleSingleSubmit}
          className="flex flex-col gap-3.5"
          noValidate
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-time"
              className="text-xs font-bold text-stone-700"
            >
              Jam Mulai (24 Jam) <span aria-hidden="true">*</span>
            </label>
            <input
              ref={timeRef}
              id="activity-time"
              name="start_time"
              type="time"
              required
              value={startTime}
              aria-invalid={
                formError?.field === 'start_time' ? 'true' : undefined
              }
              onInput={(e) => {
                setStartTime((e.target as HTMLInputElement).value);
                if (formError) setFormError(null);
              }}
              className="tabular-time w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="activity-title"
                className="text-xs font-bold text-stone-700"
              >
                Judul Kegiatan <span aria-hidden="true">*</span>
              </label>
              <span className="text-[11px] font-medium text-stone-400 tabular-time">
                {title.length}/{MAX_ACTIVITY_TITLE_LENGTH}
              </span>
            </div>
            <input
              ref={titleRef}
              id="activity-title"
              name="title"
              type="text"
              required
              maxLength={MAX_ACTIVITY_TITLE_LENGTH}
              placeholder="Misal: Kunjungan ke Radar Lampung"
              value={title}
              enterKeyHint="next"
              aria-invalid={formError?.field === 'title' ? 'true' : undefined}
              onInput={(e) => {
                setTitle((e.target as HTMLInputElement).value);
                if (formError) setFormError(null);
              }}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="activity-desc"
                className="text-xs font-bold text-stone-700"
              >
                Catatan / Deskripsi (Opsional)
              </label>
              <span className="text-[11px] font-medium text-stone-400 tabular-time">
                {description.length}/{MAX_ACTIVITY_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              ref={descRef}
              id="activity-desc"
              name="description"
              rows={3}
              maxLength={MAX_ACTIVITY_DESCRIPTION_LENGTH}
              placeholder="Durasi, kode booking, PIC, atau keterangan..."
              value={description}
              aria-invalid={
                formError?.field === 'description' ? 'true' : undefined
              }
              onInput={(e) => {
                setDescription((e.target as HTMLTextAreaElement).value);
                if (formError) setFormError(null);
              }}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-stone-900"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-maps"
              className="text-xs font-bold text-stone-700"
            >
              Link atau Nama Lokasi Google Maps (Opsional)
            </label>
            <input
              ref={mapsRef}
              id="activity-maps"
              name="maps_url"
              type="text"
              placeholder="Tempel link Maps atau ketik nama lokasi"
              value={mapsRaw}
              autoCorrect="off"
              autoCapitalize="none"
              spellcheck={false}
              aria-invalid={
                formError?.field === 'maps_url' ||
                (mapsTouched && mapsPreview.status === 'invalid')
                  ? 'true'
                  : undefined
              }
              aria-describedby="activity-maps-hint"
              onInput={(e) => {
                setMapsRaw((e.target as HTMLInputElement).value);
                if (formError) setFormError(null);
              }}
              onBlur={() => setMapsTouched(true)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 text-stone-900"
            />
            <div id="activity-maps-hint" className="text-[11px] leading-snug">
              {mapsPreview.status === 'direct_url' && (
                <span className="text-emerald-700 font-bold break-all">
                  Tautan resmi terdeteksi: {mapsPreview.url}
                </span>
              )}
              {mapsPreview.status === 'search_fallback' && (
                <span className="text-stone-600">
                  Akan dibuka di Google Maps:{' '}
                  <strong>{mapsPreview.query}</strong>
                </span>
              )}
              {mapsTouched && mapsPreview.status === 'invalid' && (
                <span className="text-red-600 font-bold">
                  {mapsPreview.message}
                </span>
              )}
              {mapsPreview.status === 'empty' && (
                <span className="text-stone-400">
                  Otomatis mengekstrak link dari teks Share Maps atau mengubah nama lokasi jadi rute pencarian.
                </span>
              )}
            </div>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 m-0"
            >
              {formError.message}
            </p>
          )}

          <div className="sticky bottom-0 bg-white pt-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] rounded-xl bg-stone-100 px-4 text-xs font-bold text-stone-700 hover:bg-stone-200"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[46px] flex-1 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-45 hover:bg-stone-800 active:scale-[0.99] transition-transform"
              >
                {editingItem ? 'Simpan Perubahan' : 'Simpan Kegiatan'}
              </button>
            </div>

            {editingItem && onRequestDelete && (
              <button
                type="button"
                onClick={() => {
                  const target = editingItem;
                  onClose();
                  onRequestDelete(target);
                }}
                className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Hapus Kegiatan</span>
              </button>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="flex flex-col gap-3.5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
            <strong className="font-bold">Panduan Cepat Bulk Input (1 baris = 1 kegiatan):</strong>
            <ul className="m-0 mt-1 pl-4 space-y-0.5">
              <li>
                <strong>Copy Tabel Word/Excel:</strong> langsung blok &amp; paste (`Waktu`, `Agenda`, `Keterangan`, `Lokasi`).
              </li>
              <li>
                <strong>Format Pipa:</strong> <code>09:00 | Judul | Catatan | Nama Lokasi</code>
              </li>
              <li>
                <strong>Format Cepat WA:</strong> <code>10.30-12.00 Penjemputan rombongan</code>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="bulk-input-textarea"
              className="text-xs font-bold text-stone-700"
            >
              Tempel Daftar Jadwal
            </label>
            <textarea
              id="bulk-input-textarea"
              name="bulk_text"
              rows={5}
              placeholder={
                '09:00 Penjemputan rombongan\n10:30 | Kunjungan Saibumi | Peninjauan mitra | Saibumi Lampung\n12.00-13.00 Sholat Jumat'
              }
              value={bulkText}
              onInput={(e) => {
                setBulkText((e.target as HTMLTextAreaElement).value);
                if (formError) setFormError(null);
              }}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 font-mono text-stone-900"
            />
          </div>

          {bulkParsedItems.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="m-0 mb-2 text-[11px] font-bold text-stone-700">
                Live Preview — {bulkParsedItems.length} kegiatan terdeteksi:
              </p>
              <div className="max-h-36 overflow-y-auto divide-y divide-stone-200/80">
                {bulkParsedItems.map((parsed, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 py-1.5 text-xs"
                  >
                    <span className="tabular-time shrink-0 rounded bg-white border border-stone-200 px-1.5 py-0.5 font-bold text-stone-900">
                      {parsed.start_time}
                    </span>
                    <span className="flex-1 truncate font-medium text-stone-800">
                      {parsed.title}
                    </span>
                    {parsed.maps_url && (
                      <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 m-0"
            >
              {formError.message}
            </p>
          )}

          <button
            type="submit"
            disabled={bulkParsedItems.length === 0 || isSubmitting}
            className="min-h-[46px] w-full rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 active:scale-[0.99] transition-transform"
          >
            Masukkan {bulkParsedItems.length} Kegiatan ke Tanggal Ini
          </button>
        </form>
      )}
    </ModalSheet>
  );
}
