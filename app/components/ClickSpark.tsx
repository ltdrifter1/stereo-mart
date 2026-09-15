'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Spark = {
  id: number;
  x: number;
  y: number;
  glyph: string;
  rot: number;
  hue: string;
};

const GLYPHS = ['♪', '♫', '★', '●', '◆', '✧'];
const HUES = ['#e0b64f', '#c97f4e', '#6f7d5a', '#7d93a6', '#a63a32', '#ece4d2'];

/**
 * Cartoon click confetti — BT “cute surprise” energy in record-shop glyphs.
 * Desktop / fine pointer only; never blocks the room.
 */
export default function ClickSpark({ active }: { active: boolean }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const seq = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const burst = useCallback((x: number, y: number) => {
    if (reduced.current) return;
    const n = 5 + Math.floor(Math.random() * 3);
    const batch: Spark[] = [];
    for (let i = 0; i < n; i++) {
      seq.current += 1;
      batch.push({
        id: seq.current,
        x,
        y,
        glyph: GLYPHS[(seq.current + i) % GLYPHS.length],
        rot: (Math.random() - 0.5) * 50,
        hue: HUES[(seq.current + i) % HUES.length],
      });
    }
    setSparks((prev) => [...prev.slice(-18), ...batch]);
    window.setTimeout(() => {
      const ids = new Set(batch.map((s) => s.id));
      setSparks((prev) => prev.filter((s) => !ids.has(s.id)));
    }, 720);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      const hot =
        document.documentElement.classList.contains('cursor-hot') ||
        Boolean(t.closest('[data-cursor="click"], a[href], button, [role="button"]'));
      if (!hot) return;
      burst(e.clientX, e.clientY);
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [active, burst]);

  if (!sparks.length) return null;

  return (
    <div className="click-sparks" aria-hidden>
      {sparks.map((s, i) => (
        <span
          key={s.id}
          className="click-spark"
          style={{
            left: s.x,
            top: s.y,
            color: s.hue,
            ['--spark-rot' as string]: `${s.rot}deg`,
            ['--spark-dx' as string]: `${(i % 2 === 0 ? -1 : 1) * (18 + (i % 5) * 10)}px`,
            ['--spark-dy' as string]: `${-28 - (i % 4) * 14}px`,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}
