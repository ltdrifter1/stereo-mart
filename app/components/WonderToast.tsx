'use client';

import { useEffect, useRef, useState } from 'react';
import { WONDER_EVENT } from './AmbientHits';

type WonderDetail = { href: string; label: string };

const OPEN_DELAY_MS = 1100;
const FADE_MS = 280;

/**
 * balmingtiger-style wonder confirm — brief toast before a rabbit-hole tab opens.
 * Listens for `stereo-mart-wonder` from AmbientHits (Canvas → DOM bridge).
 */
export default function WonderToast({ active }: { active: boolean }) {
  const [tip, setTip] = useState<WonderDetail | null>(null);
  const [on, setOn] = useState(false);
  const openTimer = useRef(0);
  const fadeTimer = useRef(0);

  useEffect(() => {
    if (!active) return;

    const onWonder = (e: Event) => {
      const detail = (e as CustomEvent<WonderDetail>).detail;
      if (!detail?.href) return;
      window.clearTimeout(openTimer.current);
      window.clearTimeout(fadeTimer.current);
      setTip(detail);
      setOn(true);
      openTimer.current = window.setTimeout(() => {
        window.open(detail.href, '_blank', 'noopener,noreferrer');
        setOn(false);
        fadeTimer.current = window.setTimeout(() => setTip(null), FADE_MS);
      }, OPEN_DELAY_MS);
    };

    window.addEventListener(WONDER_EVENT, onWonder);
    return () => {
      window.removeEventListener(WONDER_EVENT, onWonder);
      window.clearTimeout(openTimer.current);
      window.clearTimeout(fadeTimer.current);
    };
  }, [active]);

  if (!tip) return null;

  return (
    <div
      className={`wonder-toast${on ? ' is-on' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="wonder-toast-kicker">Rabbit hole</span>
      <span className="wonder-toast-label">{tip.label}</span>
    </div>
  );
}
