import { useEffect, useRef, useState } from 'preact/hooks';
import { parseSmartMapsInput } from '../domain/mapsUrl';
import {
  MAX_ACTIVITY_DESCRIPTION_LENGTH,
  MAX_ACTIVITY_TITLE_LENGTH,
  type ActivityInputDto,
  type ItineraryItemRecord,
  type ValidationError,
} from '../domain/types';
import { TrashIcon } from './Icons';
import { ModalSheet } from './ModalSheet';

interface ActivityFormSheetProps {
  isOpen: boolean;
  editingItem: ItineraryItemRecord | null;
  onClose: () => void;
  onSave: (
    rawInput: ActivityInputDto,
    editingId: string | null,
  ) => ValidationError | null;
  onDelete: (itemId: string) => ValidationError | null;
}

export function ActivityFormSheet({
  isOpen,
  editingItem,
  onClose,
  onSave,
  onDelete,
}: ActivityFormSheetProps) {
  const [startTime, setStartTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mapsRaw, setMapsRaw] = useState('');
  const [mapsTouched, setMapsTouched] = useState(false);
  const [formError, setFormError] = useState<ValidationError | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const mapsRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
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
    }
    setMapsTouched(false);
    setFormError(null);
    setIsConfirmingDelete(false);
    setIsSubmitting(false);
  }, [isOpen, editingItem]);

  const mapsPreview = parseSmartMapsInput(mapsRaw);

  function focusFieldByError(field?: string): void {
    if (field === 'start_time') timeRef.current?.focus();
    else if (field === 'title') titleRef.current?.focus();
    else if (field === 'maps_url') mapsRef.current?.focus();
    else if (field === 'description') descRef.current?.focus();
  }

  function handleSubmit(event: Event): void {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const error = onSave(
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

  function handleConfirmedDelete(): void {
    if (!editingItem || isSubmitting) return;
    setIsSubmitting(true);
    const err = onDelete(editingItem.id);
    setIsSubmitting(false);
    if (err) {
      setFormError(err);
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="activity-time"
            className="text-[14px] font-medium text-[var(--ink-primary)]"
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
            aria-invalid={formError?.field === 'start_time' ? 'true' : undefined}
            onInput={(e) => {
              setStartTime((e.target as HTMLInputElement).value);
              if (formError) setFormError(null);
            }}
            className="tabular-time w-full rounded-[10px] border border-[#BFB8AA] bg-white px-3 text-[var(--ink-primary)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="activity-title"
              className="text-[14px] font-medium text-[var(--ink-primary)]"
            >
              Judul Kegiatan <span aria-hidden="true">*</span>
            </label>
            <span className="text-[12px] text-[var(--ink-muted)] tabular-time">
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
            placeholder="Contoh: Rapat Evaluasi / Kereta Gambir"
            value={title}
            enterKeyHint="next"
            aria-invalid={formError?.field === 'title' ? 'true' : undefined}
            onInput={(e) => {
              setTitle((e.target as HTMLInputElement).value);
              if (formError) setFormError(null);
            }}
            className="w-full rounded-[10px] border border-[#BFB8AA] bg-white px-3 text-[var(--ink-primary)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="activity-maps"
            className="text-[14px] font-medium text-[var(--ink-primary)]"
          >
            Link atau Nama Lokasi Google Maps (Opsional)
          </label>
          <input
            ref={mapsRef}
            id="activity-maps"
            name="maps_url"
            type="text"
            placeholder="Tempel hasil Share Google Maps atau ketik nama gedung"
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
            className="w-full rounded-[10px] border border-[#BFB8AA] bg-white px-3 text-[var(--ink-primary)]"
          />
          <div id="activity-maps-hint" className="text-[12.5px] leading-snug">
            {mapsPreview.status === 'direct_url' && (
              <span className="text-[var(--accent-primary)] font-medium break-all">
                Tautan resmi terdeteksi: {mapsPreview.url}
              </span>
            )}
            {mapsPreview.status === 'search_fallback' && (
              <span className="text-[var(--ink-secondary)]">
                Akan dibuka sebagai pencarian Google Maps:{' '}
                <strong>{mapsPreview.query}</strong>
              </span>
            )}
            {mapsTouched && mapsPreview.status === 'invalid' && (
              <span className="text-[var(--danger)] font-medium">
                {mapsPreview.message}
              </span>
            )}
            {mapsPreview.status === 'empty' && (
              <span className="text-[var(--ink-muted)]">
                Bisa menempel teks Share langsung dari aplikasi Google Maps.
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="activity-desc"
              className="text-[14px] font-medium text-[var(--ink-primary)]"
            >
              Catatan / Deskripsi (Opsional)
            </label>
            <span className="text-[12px] text-[var(--ink-muted)] tabular-time">
              {description.length}/{MAX_ACTIVITY_DESCRIPTION_LENGTH}
            </span>
          </div>
          <textarea
            ref={descRef}
            id="activity-desc"
            name="description"
            rows={3}
            maxLength={MAX_ACTIVITY_DESCRIPTION_LENGTH}
            placeholder="Nomor kursi, kode booking, kontak PIC, atau catatan detail..."
            value={description}
            aria-invalid={
              formError?.field === 'description' ? 'true' : undefined
            }
            onInput={(e) => {
              setDescription((e.target as HTMLTextAreaElement).value);
              if (formError) setFormError(null);
            }}
            className="w-full rounded-[10px] border border-[#BFB8AA] bg-white p-3 text-[var(--ink-primary)]"
          />
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[14px] font-medium text-[var(--danger)] m-0"
          >
            {formError.message}
          </p>
        )}

        <div className="sticky bottom-0 bg-[var(--surface-sheet)] pt-2 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-[10px] border border-[#D6CFC2] px-4 text-[15px] font-medium text-[var(--ink-secondary)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[48px] flex-1 rounded-[10px] bg-[var(--accent-primary)] px-4 text-[15px] font-semibold text-white disabled:opacity-50 hover:bg-[var(--accent-primary-hover)]"
            >
              Simpan Kegiatan
            </button>
          </div>

          {editingItem && (
            <div className="border-t border-[#E7E2D8] pt-2.5">
              {!isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 text-[14px] font-medium text-[var(--danger)]"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Hapus Kegiatan</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="min-h-[44px] flex-1 rounded-[10px] border border-[#D6CFC2] bg-white px-3 text-[14px] font-medium text-[var(--ink-primary)]"
                  >
                    Jangan Hapus
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmedDelete}
                    className="min-h-[44px] flex-1 rounded-[10px] bg-[var(--danger)] px-3 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Yakin Hapus?
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </ModalSheet>
  );
}
