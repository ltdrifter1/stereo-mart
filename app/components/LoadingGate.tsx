'use client';

import { BRAND_FULL } from '@/lib/brand';

import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import gsap from 'gsap';

import { GATE_FADE_DUR } from '@/lib/pano';

/**
 * Entry gate — BT clickIntro: wordmark, LOADING n%, then
 * “best with audio / CLICK TO ENTER”. Look-around stays locked until enter.
 */
export default function LoadingGate({
  onEntered,
}: {
  onEntered: () => void | Promise<void>;
}) {
  const { progress, active } = useProgress();
  const [ready, setReady] = useState(false);
  const [pct, setPct] = useState(0);
  const [entering, setEntering] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const mounted = useRef(Date.now());

  useEffect(() => {
    const p = Math.round(progress);
    setPct((prev) => (p > prev ? p : prev));
  }, [progress]);

  useEffect(() => {
    const elapsed = Date.now() - mounted.current;
    if (!active && progress >= 100) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wait = reduce ? 0 : Math.max(0, 800 - elapsed);
      const id = setTimeout(() => setReady(true), wait);
      return () => clearTimeout(id);
    }
  }, [active, progress]);

  // Never trap the visitor on LOADING 0% if the GPU texture tracker stalls.
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 7000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ready && enterBtn.current) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.to(enterBtn.current, {
        opacity: 1,
        y: 0,
        duration: reduce ? 0 : 0.6,
        ease: 'power3.out',
      });
    }
  }, [ready]);

  const enter = async () => {
    if (!ready || entering) return;
    setEntering(true);
    if (root.current) root.current.style.pointerEvents = 'none';
    try {
      await onEntered();
    } catch {
      /* scene still enters even if audio fails */
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const waitForPose = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
    if (!reduce) await waitForPose();
    gsap.to(root.current, {
      opacity: 0,
      duration: reduce ? 0 : GATE_FADE_DUR,
      ease: 'power1.inOut',
      onComplete: () => {
        if (root.current) root.current.style.display = 'none';
      },
    });
  };

  return (
    <div className="gate gate-poster" ref={root} role="dialog" aria-label={`Enter ${BRAND_FULL}`}>
      <div className="gate-paper" aria-hidden />

      <div className="gate-inner">
        <p className="gate-word" aria-hidden>
          <span className="gate-word-club">CLUB</span>
          <span className="gate-word-copy">COPY</span>
        </p>
        <p className="gate-word-line">HANGOUT</p>

        <div className="gate-copy">
          <p className={`gate-loading${ready ? ' is-done' : ''}`} aria-live="polite">
            {ready ? (
              <>Best experienced with your device’s audio enabled.</>
            ) : (
              <>
                LOADING <span className="gate-pct">{pct}%</span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          className="gate-enter"
          ref={enterBtn}
          onClick={() => void enter()}
          disabled={!ready || entering}
          data-cursor="click"
        >
          {ready ? 'CLICK TO ENTER' : '\u00a0'}
        </button>
      </div>
    </div>
  );
}
