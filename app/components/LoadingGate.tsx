'use client';

import { BRAND_FULL, BRAND_LINE, BRAND_NAME } from '@/lib/brand';

import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import gsap from 'gsap';

import { GATE_FADE_DUR, LQIP_SRC } from '@/lib/pano';

/**
 * Entry gate — bright cartoon shopfront for Stereo-Mart Records.
 * Enter unlocks audio + drop pose, waits one paint, then fades so the
 * little-planet frame is visible as the gate clears (iOS Safari sync).
 * Audio unlock must run in the click gesture (not deferred to GSAP alone).
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
  const [lqipOn, setLqipOn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const mounted = useRef(Date.now());

  // Progressive feel — paint the store behind the brand as soon as LQIP lands.
  useEffect(() => {
    const img = new Image();
    img.src = LQIP_SRC;
    if (img.complete) {
      setLqipOn(true);
      return;
    }
    img.onload = () => setLqipOn(true);
  }, []);

  useEffect(() => {
    const p = Math.round(progress);
    setPct((prev) => (p > prev ? p : prev));
    if (bar.current) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.to(bar.current, {
        scaleX: Math.max(0.02, progress / 100),
        duration: reduce ? 0 : 0.5,
        ease: 'power2.out',
      });
    }
  }, [progress]);

  useEffect(() => {
    const elapsed = Date.now() - mounted.current;
    if (!active && progress >= 100) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wait = reduce ? 0 : Math.max(0, 1000 - elapsed);
      const id = setTimeout(() => setReady(true), wait);
      return () => clearTimeout(id);
    }
  }, [active, progress]);

  useEffect(() => {
    if (ready && enterBtn.current) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.to(enterBtn.current, {
        opacity: 1,
        y: 0,
        duration: reduce ? 0 : 0.8,
        ease: 'power3.out',
      });
    }
  }, [ready]);

  const enter = async () => {
    if (!ready || entering) return;
    setEntering(true);
    // Unlock audio + flip enteredRef inside the user gesture.
    try {
      await onEntered();
    } catch {
      /* scene still enters even if audio fails */
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Let Scene apply the ceiling / planet pose for at least one frame
    // before fading — otherwise Safari can miss the intro start under the gate.
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
    <div className="gate" ref={root} role="dialog" aria-label={`Enter ${BRAND_FULL}`}>
      <div className={`gate-lqip${lqipOn ? ' is-on' : ''}`} aria-hidden>
        <img src={LQIP_SRC} alt="" draggable={false} />
        <span className="gate-lqip-veil" />
      </div>

      <div className="gate-atmosphere" aria-hidden>
        <span className="gate-mist gate-mist-a" />
        <span className="gate-mist gate-mist-b" />
        <span className="gate-orb gate-orb-a" />
        <span className="gate-orb gate-orb-b" />
        <span className="gate-sun" />
        <span className="gate-grain" />
        <span className="gate-frame gate-frame-top" />
        <span className="gate-frame gate-frame-bottom" />
      </div>

      <div className="gate-inner" ref={inner}>
        <div className="gate-vinyl" aria-hidden>
          <span className="gate-vinyl-disc" />
          <span className="gate-vinyl-label" />
          <span className="gate-vinyl-hole" />
        </div>

        <p className="gate-kicker">Illustrated record shop</p>

        <h1 className="gate-mark">
          <span className="gate-mark-brand">{BRAND_NAME}</span>
          <span className="gate-mark-shop">{BRAND_LINE}</span>
        </h1>

        <span className="gate-rule" aria-hidden />
        <p className="gate-sub">Best experienced with audio enabled</p>

        <div
          className="gate-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Loading store"
        >
          <i ref={bar} />
        </div>
        <div className="gate-status">
          <span>{ready ? 'Ready' : 'Preparing the shop'}</span>
          <span>{pct}%</span>
        </div>

        <button
          type="button"
          className="gate-enter"
          ref={enterBtn}
          onClick={() => void enter()}
          disabled={!ready || entering}
          data-cursor="click"
        >
          {ready ? 'Enter the shop' : 'Loading…'}
        </button>
      </div>
    </div>
  );
}
