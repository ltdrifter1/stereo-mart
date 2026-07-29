'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Branded floating cursor — balmingtiger `.cursors` pattern.
 * Desktop / fine pointer only; touch + coarse pointers keep native cursors.
 * Click glyph: pointerdown, canvas `cursor-hot`, or `[data-cursor="click"]` hover.
 *
 * Enter contract: reveals with a short scale-in once the room is entered;
 * presses scale down for tactile feedback.
 */
export default function CustomCursor({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [hot, setHot] = useState(false);
  const pos = useRef({ x: -100, y: -100, rot: 0, vx: 0 });
  const last = useRef({ x: 0, y: 0, t: 0 });
  const raf = useRef(0);

  useEffect(() => {
    if (!active) {
      setEnabled(false);
      setRevealed(false);
      document.documentElement.classList.remove('has-custom-cursor');
      return;
    }

    const fine = window.matchMedia('(pointer: fine)').matches;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ok = fine && !touch && !reduce;
    setEnabled(ok);
    document.documentElement.classList.toggle('has-custom-cursor', ok);
    return () => document.documentElement.classList.remove('has-custom-cursor');
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
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;

      const t = e.target;
      const clickable =
        t instanceof Element &&
        Boolean(t.closest('[data-cursor="click"], a[href], button, [role="button"]'));
      const canvasHot = document.documentElement.classList.contains('cursor-hot');
      setHot(clickable || canvasHot);
    };

    const onDown = () => setPressing(true);
    const onUp = () => setPressing(false);

    const tick = () => {
      const el = root.current;
      if (el) {
        const target = Math.max(-0.9, Math.min(0.9, pos.current.vx * 18));
        pos.current.rot += (target - pos.current.rot) * 0.18;
        pos.current.vx *= 0.86;
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) rotate(${pos.current.rot * 55}deg)`;
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
    const rootEl = document.documentElement;
    const syncHot = () => {
      if (rootEl.classList.contains('cursor-hot')) setHot(true);
    };
    const obs = new MutationObserver(syncHot);
    obs.observe(rootEl, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
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
