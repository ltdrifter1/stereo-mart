'use client';

import { useEffect, useRef, useState } from 'react';
import type { Controls } from './sceneContext';

const STORAGE_KEY = 'stereo-mart-drag-hint-seen';
const FADE_MS = 560;
const AUTO_HIDE_MS = 6200;

type Props = {
  /** True once the intro unlocks look-around. */
  active: boolean;
  controls: Controls;
  reduceMotion?: boolean;
};

/**
 * First-visit onboarding cue — drag / swipe to look around.
 * Never blocks the scene. Fades after a few seconds or on first drag.
 * Shown once per browser via localStorage. Lifted above iOS conveyor.
 */
export default function DragHint({ active, controls, reduceMotion = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [opaque, setOpaque] = useState(false);
  const [touchCopy, setTouchCopy] = useState(false);
  const dismissed = useRef(false);
  const fadeTimer = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTouchCopy(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    if (!active || dismissed.current) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* private mode — still show once this session */
    }
    setMounted(true);
    // Beat after settle unlock so the cue lands with the invite breath.
    const id = window.setTimeout(() => setOpaque(true), reduceMotion ? 0 : 180);
    return () => window.clearTimeout(id);
  }, [active, reduceMotion]);

  useEffect(() => {
    if (!mounted || dismissed.current) return;

    const markSeen = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    };

    const dismiss = () => {
      if (dismissed.current) return;
      dismissed.current = true;
      setOpaque(false);
      markSeen();
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(
        () => setMounted(false),
        reduceMotion ? 0 : FADE_MS,
      );
    };

    const auto = window.setTimeout(dismiss, reduceMotion ? 0 : AUTO_HIDE_MS);

    let raf = 0;
    const tick = () => {
      if (controls.dragged) {
        dismiss();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(auto);
      window.clearTimeout(fadeTimer.current);
      cancelAnimationFrame(raf);
    };
  }, [mounted, controls, reduceMotion]);

  if (!mounted) return null;

  return (
    <div
      className={`drag-hint${opaque ? ' is-on' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={!opaque}
    >
      <span className="drag-hint-glyph" aria-hidden>
        <svg width="40" height="18" viewBox="0 0 40 18" fill="none">
          <path
            d="M8 9H32"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M12.5 5L8 9l4.5 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M27.5 5L32 9l-4.5 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="9" r="2.1" fill="currentColor" />
        </svg>
      </span>
      <span className="drag-hint-copy">
        <span className="drag-hint-label">
          {touchCopy ? 'Swipe to look around' : 'Drag to look around'}
        </span>
        <span className="drag-hint-sub">
          {touchCopy ? 'Tap a glow to step in' : 'Click a glow to step in'}
        </span>
      </span>
    </div>
  );
}
