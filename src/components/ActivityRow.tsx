import { isAllowedGoogleMapsUrl } from '../domain/mapsUrl';
import type { ItineraryItemRecord } from '../domain/types';
import {
  ChevronDownIcon,
  EditIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from './Icons';

interface ActivityRowProps {
  item: ItineraryItemRecord;
  onEdit: (item: ItineraryItemRecord) => void;
}

export function ActivityRow({ item, onEdit }: ActivityRowProps) {
  const hasSafeMapsUrl =
    item.maps_url !== null && isAllowedGoogleMapsUrl(item.maps_url);

  return (
    <details className="group border-b border-[#E7DCAB]/80 last:border-b-0">
      <summary className="flex min-h-[52px] items-start gap-3 px-4 py-3 select-none hover:bg-black/[0.025] rounded-[8px]">
        <span className="tabular-time w-[52px] shrink-0 pt-0.5 text-[14px] font-semibold text-[var(--accent-primary)]">
          {item.start_time}
        </span>

        <span
          data-testid="activity-title"
          className="flex-1 min-w-0 break-words text-[16px] font-medium leading-[1.35] text-[var(--ink-primary)]"
        >
          {item.title}
        </span>

        <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[var(--ink-secondary)]">
          {hasSafeMapsUrl && (
            <span
              title="Tersedia tautan Google Maps"
              className="inline-flex items-center justify-center rounded-[6px] bg-[#DBEAFE] p-1 text-[var(--accent-maps)]"
            >
              <MapPinIcon className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDownIcon className="accordion-chevron w-4 h-4 text-[var(--ink-muted)]" />
        </span>
      </summary>

      <div className="pl-[64px] pr-4 pb-3.5 pt-0.5 flex flex-col gap-3">
        {item.description ? (
          <p className="m-0 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-[var(--ink-secondary)]">
            {item.description}
          </p>
        ) : (
          <p className="m-0 text-[13.5px] italic text-[var(--ink-muted)]">
            Tidak ada catatan tambahan.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {hasSafeMapsUrl && item.maps_url && (
            <a
              href={item.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] bg-[var(--accent-maps)] px-3.5 py-2 text-[14px] font-medium text-white no-underline hover:opacity-95"
            >
              <MapPinIcon className="w-4 h-4" />
              <span>Buka di Google Maps</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 opacity-85" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label={`Edit Kegiatan ${item.title}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[#D4C89E] bg-white/80 px-3 py-2 text-[14px] font-medium text-[var(--ink-primary)] hover:bg-white"
          >
            <EditIcon className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </details>
  );
}
