'use client';

import { BRAND_FULL } from '@/lib/brand';

import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import gsap from 'gsap';

import { GATE_FADE_DUR } from '@/lib/pano';
import { MOTION } from '@/lib/motion';

/**
 * Entry gate — BT clickIntro shape, Stereo-Mart globe:
 * logo, LOADING n%, then “best with audio / CLICK TO ENTER”.
 * Look-around stays locked until enter (Experience + Rig).
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
  const copyRef = useRef<HTMLParagraphElement>(null);
  const pctProxy = useRef({ v: 0 });
  const mounted = useRef(Date.now());

  useEffect(() => {
    const target = Math.round(progress);
    gsap.to(pctProxy.current, {
      v: target,
      duration: 0.35,
      ease: 'power1.out',
      overwrite: true,
      onUpdate: () => setPct(Math.round(pctProxy.current.v)),
    });
  }, [progress]);

  useEffect(() => {
    if (!active && progress >= 100) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      const hold = reduce
        ? 0
        : Math.max(
            0,
            (mobile ? MOTION.readyHoldMobile : MOTION.readyHoldDesktop) * 1000 -
              (Date.now() - mounted.current),
          );
      const id = setTimeout(() => setReady(true), hold);
      return () => clearTimeout(id);
    }
  }, [active, progress]);

  // Never trap the visitor on LOADING 0% if the GPU texture tracker stalls.
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 7000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (copyRef.current && !reduce) {
      gsap.fromTo(
        copyRef.current,
        { opacity: 0.35, y: 6 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      );
    }
    if (enterBtn.current) {
      gsap.to(enterBtn.current, {
        opacity: 1,
        y: 0,
        duration: reduce ? 0 : MOTION.enterButton,
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
    <div
      className="gate gate-poster"
      ref={root}
      role="dialog"
      aria-label={`Enter ${BRAND_FULL}`}
      aria-busy={!ready}
    >
      <div className="gate-paper" aria-hidden />

      <div className="gate-inner">
          <img
            className="gate-logo gate-logo-bounce"
            src="/brand/stereo-mart-globe.svg"
            alt={BRAND_FULL}
            draggable={false}
          />

        <div className="gate-copy">
          <p
            ref={copyRef}
            className={`gate-loading${ready ? ' is-done' : ''}`}
            aria-live="polite"
          >
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
