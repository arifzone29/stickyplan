import { isAllowedGoogleMapsUrl } from '../domain/mapsUrl';
import type { ItineraryItem } from '../domain/types';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  EditIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  MapPinIcon,
  TrashIcon,
} from './Icons';

interface ActivityRowProps {
  item: ItineraryItem;
  index: number;
  totalItems: number;
  isOpen: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  expandedBgClass: string;
  hoverBgClass: string;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onHandlePointerDown: (event: PointerEvent) => void;
}

export function ActivityRow({
  item,
  index,
  totalItems,
  isOpen,
  isDragged,
  isDropTarget,
  expandedBgClass,
  hoverBgClass,
  onToggle,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDeleteRequest,
  onHandlePointerDown,
}: ActivityRowProps) {
  const hasSafeMapsUrl =
    item.maps_url !== null && isAllowedGoogleMapsUrl(item.maps_url);

  return (
    <li
      data-item-index={index}
      className={`transition-opacity duration-150 ${
        isDragged ? 'opacity-40' : ''
      } ${isDropTarget ? 'border-t-2 border-t-stone-900' : ''}`}
    >
      <div
        className={`flex min-h-[50px] items-center gap-1.5 px-2.5 py-2 transition-colors ${hoverBgClass} ${
          isOpen ? expandedBgClass : ''
        }`}
      >
        <button
          type="button"
          aria-label={`Geser urutan ${item.title}`}
          onPointerDown={onHandlePointerDown}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && index > 0) {
              e.preventDefault();
              onMoveUp();
            } else if (e.key === 'ArrowDown' && index < totalItems - 1) {
              e.preventDefault();
              onMoveDown();
            }
          }}
          className="drag-handle inline-flex h-10 w-7 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:text-stone-700"
        >
          <GripVerticalIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="flex flex-1 min-w-0 items-center gap-2.5 py-1 pr-1 text-left"
        >
          <span className="tabular-time shrink-0 rounded-md border border-stone-900/10 bg-white/80 px-2 py-0.5 text-xs font-bold text-stone-900">
            {item.start_time}
          </span>

          <span
            data-testid="activity-title"
            className="flex-1 min-w-0 break-words text-sm font-bold leading-snug text-stone-900"
          >
            {item.title}
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {hasSafeMapsUrl && (
              <span
                title="Tersedia tautan Google Maps"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              >
                <MapPinIcon className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDownIcon
              className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {isOpen && (
        <div
          className={`px-4 pb-3.5 pt-2 border-t border-stone-900/10 flex flex-col gap-3 ${expandedBgClass}`}
        >
          {item.description ? (
            <p className="m-0 whitespace-pre-line break-words text-xs leading-relaxed text-stone-700">
              {item.description}
            </p>
          ) : (
            <p className="m-0 text-xs italic text-stone-400">
              Tidak ada keterangan tambahan.
            </p>
          )}

          {hasSafeMapsUrl && item.maps_url && (
            <a
              href={item.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white no-underline shadow-xs hover:bg-emerald-700 active:scale-[0.99] transition-transform"
            >
              <MapPinIcon className="w-3.5 h-3.5" />
              <span>Buka di Google Maps</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 opacity-90" />
            </a>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-stone-900/10 pt-2.5">
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={onMoveUp}
                aria-label={`Geser ke atas: ${item.title}`}
                className="inline-flex h-9 w-9 min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-stone-900/15 bg-white text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100 active:scale-95 transition-transform"
              >
                <ArrowUpIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={index === totalItems - 1}
                onClick={onMoveDown}
                aria-label={`Geser ke bawah: ${item.title}`}
                className="inline-flex h-9 w-9 min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-stone-900/15 bg-white text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-stone-100 active:scale-95 transition-transform"
              >
                <ArrowDownIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit Kegiatan ${item.title}`}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-stone-900/15 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 active:scale-95 transition-transform"
              >
                <EditIcon className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={onDeleteRequest}
                aria-label={`Hapus Kegiatan ${item.title}`}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-transform"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
