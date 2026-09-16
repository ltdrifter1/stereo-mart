'use client';

import { useEffect, useRef, useState } from 'react';

import { isDocumentHidden } from '@/lib/math';
import { MOTION } from '@/lib/motion';
import { isPointerHot, subscribePointerHover } from '@/lib/pointerHover';

/**
 * Branded floating cursor — balmingtiger `.cursors` pattern.
 * Desktop / fine pointer only; touch + coarse pointers keep native cursors.
 *
 * Follow is slightly lerped (smoother than 1:1 on high-Hz displays).
 * Tilt comes from screen X (BT) plus a little velocity, kept restrained.
 */
export default function CustomCursor({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [hot, setHot] = useState(false);
  const pos = useRef({
    x: -100,
    y: -100,
    tx: -100,
    ty: -100,
    rot: 0,
    vx: 0,
  });
  const last = useRef({ x: 0, y: 0, t: 0 });
  const raf = useRef(0);

  useEffect(() => {
    if (!active) {
      setEnabled(false);
      setRevealed(false);
      document.documentElement.classList.remove('has-custom-cursor');
      return;
    }

    const apply = (on: boolean) => {
      const narrow = window.innerWidth <= 570;
      const next = on && !narrow;
      setEnabled(next);
      document.documentElement.classList.toggle('has-custom-cursor', next);
    };

    const fine = window.matchMedia('(pointer: fine)').matches;
    const hover = window.matchMedia('(hover: hover)').matches;
    apply(fine || hover || navigator.maxTouchPoints === 0);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') apply(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [active]);

  useEffect(() => {
    if (!enabled) {
      setRevealed(false);
      return;
    }
    const id = window.setTimeout(() => setRevealed(true), 40);
    return () => window.clearTimeout(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(8, now - (last.current.t || now));
      const dx = e.clientX - last.current.x;
      pos.current.vx = dx / dt;
      last.current = { x: e.clientX, y: e.clientY, t: now };
      pos.current.tx = e.clientX;
      pos.current.ty = e.clientY;

      const t = e.target;
      const clickable =
        t instanceof Element &&
        Boolean(t.closest('[data-cursor="click"], a[href], button, [role="button"]'));
      setHot(clickable || isPointerHot());
    };

    const onDown = () => setPressing(true);
    const onUp = () => setPressing(false);

    const tick = () => {
      const el = root.current;
      if (el && !isDocumentHidden()) {
        const p = pos.current;
        p.x += (p.tx - p.x) * MOTION.cursorLerp;
        p.y += (p.ty - p.y) * MOTION.cursorLerp;
        const nx = typeof window !== 'undefined' ? p.tx / Math.max(1, window.innerWidth) : 0.5;
        const screenTilt = (nx * 2 - 1) * MOTION.cursorTiltMax;
        const velTilt = Math.max(-8, Math.min(8, p.vx * 90));
        const target = screenTilt * 0.7 + velTilt * 0.3;
        p.rot += (target - p.rot) * MOTION.cursorRotLerp;
        p.vx *= 0.86;
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-18px, -8px) rotate(${p.rot}deg)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('blur', onUp);
    raf.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const syncHot = () => setHot(isPointerHot());
    return subscribePointerHover(syncHot);
  }, [enabled]);

  if (!enabled) return null;

  const clickGlyph = pressing || hot;
  const classes = [
    'custom-cursors',
    revealed ? 'is-revealed' : '',
    pressing ? 'is-press' : '',
    clickGlyph ? 'is-click' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} ref={root} aria-hidden>
      <img className="custom-cursor-default" src="/cursors/default.svg" alt="" draggable={false} />
      <img className="custom-cursor-click" src="/cursors/click.svg" alt="" draggable={false} />
    </div>
  );
}
