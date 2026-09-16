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
 * Stays mounted while look is unlocked so the first hover isn’t off-canvas.
 */
export default function HoverHint({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0, primed: false });
  const raf = useRef(0);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!active) {
      setEnabled(false);
      setLabel(null);
      return;
    }
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setEnabled(!coarse);
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
      if (!pos.current.primed) {
        pos.current.x = e.clientX;
        pos.current.y = e.clientY;
        pos.current.primed = true;
      }
    };

    const tick = () => {
      const el = root.current;
      if (el && !isDocumentHidden() && pos.current.primed) {
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

  useEffect(() => {
    if (!label) return;
    const p = pos.current;
    if (p.primed) {
      p.x = p.tx;
      p.y = p.ty;
    }
  }, [label]);

  if (!enabled) return null;

  return (
    <div
      ref={root}
      className={`hover-hint${label ? ' is-on' : ''}`}
      aria-hidden
    >
      <span className="hotspot-pill">{label ? label.toUpperCase() : '\u00a0'}</span>
    </div>
  );
}
