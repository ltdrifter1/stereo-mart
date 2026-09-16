'use client';

import { useCallback, useEffect, useRef } from 'react';

import { hoverEnter, hoverLeave } from '@/lib/pointerHover';

/**
 * Pair pointerover/out on a canvas mesh with the shared retain counter.
 * Guards against React Strict Mode double-mount and repeated over events.
 */
export function useCanvasHover(id: string, label?: string) {
  const hovering = useRef(false);

  const clear = useCallback(() => {
    if (!hovering.current) return;
    hovering.current = false;
    hoverLeave(id);
  }, [id]);

  useEffect(() => clear, [clear]);

  const onOver = useCallback(
    (stop: () => void, allowed = true) => {
      stop();
      if (!allowed) return;
      if (hovering.current) return;
      hovering.current = true;
      hoverEnter(id, label);
    },
    [id, label],
  );

  const onOut = useCallback(() => {
    clear();
  }, [clear]);

  return { onOver, onOut };
}
