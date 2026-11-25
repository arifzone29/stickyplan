import { useRef, useState } from 'preact/hooks';
import { SWIPE_DIRECTION_RATIO, SWIPE_MIN_DISTANCE_PX } from '../domain/types';

interface SwipeOptions {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, summary, [data-no-swipe]';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useSwipeNavigation({
  canPrev,
  canNext,
  onPrev,
  onNext,
}: SwipeOptions) {
  const startCoord = useRef<{ x: number; y: number } | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);

  function handleTouchStart(event: TouchEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE_SELECTOR)) {
      startCoord.current = null;
      return;
    }

    const activeSelection = window.getSelection?.()?.toString() ?? '';
    if (activeSelection.length > 0) {
      startCoord.current = null;
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;
    startCoord.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchMove(event: TouchEvent): void {
    if (!startCoord.current) return;
    const touch = event.touches[0];
    if (!touch) return;

    const dx = touch.clientX - startCoord.current.x;
    const dy = touch.clientY - startCoord.current.y;

    if (Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTION_RATIO) {
      if (!prefersReducedMotion()) {
        const clamped = Math.max(-72, Math.min(72, dx * 0.35));
        setDragOffsetX(clamped);
      }
    }
  }

  function handleTouchEnd(event: TouchEvent): void {
    if (!startCoord.current) return;
    const start = startCoord.current;
    startCoord.current = null;
    setDragOffsetX(0);

    const activeSelection = window.getSelection?.()?.toString() ?? '';
    if (activeSelection.length > 0) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    const isHorizontalSwipe =
      Math.abs(dx) >= SWIPE_MIN_DISTANCE_PX &&
      Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTION_RATIO;

    if (!isHorizontalSwipe) return;

    if (dx < 0 && canNext) {
      onNext();
      return;
    }
    if (dx > 0 && canPrev) {
      onPrev();
    }
  }

  function handleTouchCancel(): void {
    startCoord.current = null;
    setDragOffsetX(0);
  }

  return {
    dragOffsetX,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
}
