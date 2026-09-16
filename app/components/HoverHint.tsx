'use client';

import { useEffect, useRef, useState } from 'react';

import { MOTION } from '@/lib/motion';
import { isDocumentHidden } from '@/lib/math';
import {
  getHoverLabel,
  subscribePointerHover,
} from '@/lib/pointerHover';

/**
 * Screen-space hotspot caption — one DOM node, follows the pointer.
 * Replaces per-hotspot drei Html labels (CSS3D + layout thrash on pan).
 */
export default function HoverHint({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -999, y: -999, tx: -999, ty: -999 });
  const raf = useRef(0);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!active) {
      setEnabled(false);
      return;
    }
    const fine = window.matchMedia('(pointer: fine)').matches;
    const wide = window.innerWidth > 570;
    setEnabled(fine && wide);
  }, [active]);

  useEffect(() => {
    if (!enabled) {
      setLabel(null);
      return;
    }
    const sync = () => setLabel(getHoverLabel());
    sync();
    return subscribePointerHover(sync);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      pos.current.tx = e.clientX;
      pos.current.ty = e.clientY;
    };

    const tick = () => {
      const el = root.current;
      if (el && !isDocumentHidden()) {
        const k = MOTION.cursorLerp;
        pos.current.x += (pos.current.tx - pos.current.x) * k;
        pos.current.y += (pos.current.ty - pos.current.y) * k;
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(22px, 14px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('pointermove', onMove);
    };
  }, [enabled]);

  if (!enabled || !label) return null;

  return (
    <div ref={root} className="hover-hint" aria-hidden>
      <span className="hotspot-pill">{label.toUpperCase()}</span>
    </div>
  );
}
