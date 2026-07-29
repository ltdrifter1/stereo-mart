'use client';

import { useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import type { Controls } from './types';
import { interruptCameraAnimation } from './AnimationManager';
import { createControls } from './CameraController';
import {
  DRAG_INERTIA,
  FOLLOW_OFF_DUR,
  FOLLOW_REENABLE_DELAY,
  FOLLOW_REENABLE_DUR,
  LOOK_KEY_STEP,
  MFOV_EXPLORE,
  MFOV_MAX,
  MFOV_MIN,
  MOUSE_FOV_CHANGE,
  autoPitchLimit,
  mfovToHorizontalFov,
  mfovToVerticalFov,
} from '@/lib/pano';

/** Desktop: tight. Touch: tolerate finger jitter so taps still count as clicks. */
const DRAG_THRESHOLD_MOUSE = 5;
const DRAG_THRESHOLD_TOUCH = 14;
const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
/** Pinch → MFOV degrees scale (touch zoom parity with wheel). */
const PINCH_FOV_SCALE = 0.08;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

/**
 * Pointer / wheel / key / pinch → camera.
 *
 * Critical hit-testing rule:
 *   Do NOT setPointerCapture until the gesture crosses the drag threshold.
 *   Capturing on pointerdown (old behaviour) stole click delivery from R3F
 *   hotspot meshes — desktop + iOS taps appeared dead.
 */
export function useInteractionManager(
  stageRef: RefObject<HTMLElement | null>,
  enabledRef: RefObject<boolean>,
  onDragEndRef?: RefObject<(() => void) | null>,
  onInterruptLookRef?: RefObject<(() => void) | null>,
  /** When set, follow-mouse lean will not re-enable while a section is focused. */
  focusedRef?: RefObject<{ value: string | null }>,
) {
  const controls = useRef<Controls>(createControls({ mfov: MFOV_EXPLORE })).current;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let touch = false;
    let dragThreshold = DRAG_THRESHOLD_MOUSE;
    let capturing = false;
    let activePointerId: number | null = null;
    let followTween: gsap.core.Tween | null = null;
    let followDelay: gsap.core.Tween | null = null;

    // Pinch state (two-finger FOV)
    let pinchActive = false;
    let pinchStartDist = 0;
    let pinchStartMfov = MFOV_EXPLORE;

    const w = () => Math.max(1, stage.clientWidth || window.innerWidth);
    const h = () => Math.max(1, stage.clientHeight || window.innerHeight);
    const aspect = () => w() / h();

    const clampPitch = (pitch: number) => {
      const max = autoPitchLimit(controls.mfov, aspect());
      return Math.max(-max, Math.min(max, pitch));
    };

    const killFollowTweens = () => {
      followTween?.kill();
      followDelay?.kill();
      followTween = null;
      followDelay = null;
    };

    const perPixel = () => {
      const a = aspect();
      const vfov = mfovToVerticalFov(controls.mfov, a) * DEG;
      const hfov = mfovToHorizontalFov(controls.mfov, a) * DEG;
      return { yaw: hfov / w(), pitch: vfov / h() };
    };

    const syncPointer = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const pw = Math.max(1, rect.width);
      const ph = Math.max(1, rect.height);
      controls.pointer.x = (e.clientX - rect.left) / pw - 0.5;
      controls.pointer.y = (e.clientY - rect.top) / ph - 0.5;
    };

    const interruptLook = () => {
      if (!controls.lookAnimating) return;
      onInterruptLookRef?.current?.();
      interruptCameraAnimation(controls);
    };

    const releaseCapture = (pointerId: number) => {
      if (!capturing) return;
      capturing = false;
      try {
        stage.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    };

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current || !controls.userControl) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // UI chrome (nav / panel / mute) stops propagation — never start a pan.
      if (e.target instanceof Element) {
        if (e.target.closest('.top-nav-wrap, .top-nav-item, .panel, .mute-control, .gyro-control, .gate')) {
          return;
        }
      }

      interruptLook();
      syncPointer(e);
      controls.dragging = true;
      controls.dragged = false;
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      lastT = performance.now();
      touch = e.pointerType === 'touch' || e.pointerType === 'pen';
      dragThreshold = touch ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;
      activePointerId = e.pointerId;
      capturing = false;
      stage.classList.add('dragging');

      killFollowTweens();
      followTween = gsap.to(controls, {
        followFactor: 0,
        duration: FOLLOW_OFF_DUR,
        ease: 'power1.out',
        overwrite: true,
      });
      // Intentionally NO setPointerCapture here — see file header.
    };

    const onMove = (e: PointerEvent) => {
      syncPointer(e);
      if (!enabledRef.current || !controls.userControl || !controls.dragging) return;
      if (activePointerId != null && e.pointerId !== activePointerId) return;
      if (pinchActive) return;

      const now = performance.now();
      const dt = Math.max(1 / 120, (now - lastT) / 1000);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (!controls.dragged && dist > dragThreshold) {
        controls.dragged = true;
        // Capture only after we know this is a drag — preserves mesh clicks.
        if (!capturing && activePointerId != null) {
          try {
            stage.setPointerCapture(activePointerId);
            capturing = true;
          } catch {
            /* ignore */
          }
        }
      }

      if (!controls.dragged) return;

      const { yaw, pitch } = perPixel();
      const dYaw = dx * yaw;
      const dPitch = dy * pitch;
      controls.lookTarget.x = wrapYaw(controls.lookTarget.x + dYaw);
      controls.lookTarget.y = clampPitch(controls.lookTarget.y + dPitch);

      const retain = 1 - DRAG_INERTIA;
      controls.velocity.x = (dYaw / dt) * retain;
      controls.velocity.y = (dPitch / dt) * retain;
    };

    const onUp = (e: PointerEvent) => {
      if (!controls.dragging) return;
      if (activePointerId != null && e.pointerId !== activePointerId) return;
      const wasDrag = controls.dragged;
      controls.dragging = false;
      stage.classList.remove('dragging');
      if (activePointerId != null) releaseCapture(activePointerId);
      activePointerId = null;

      if (!touch && controls.userControl) {
        killFollowTweens();
        followDelay = gsap.delayedCall(FOLLOW_REENABLE_DELAY, () => {
          // Stay locked while a section is focused — glow framing must not drift.
          if (controls.lookAnimating) return;
          if (focusedRef?.current?.value) return;
          followTween = gsap.to(controls, {
            followFactor: 1,
            duration: FOLLOW_REENABLE_DUR,
            ease: 'power1.out',
            overwrite: true,
          });
        });
      }

      if (wasDrag) {
        onDragEndRef?.current?.();
        window.setTimeout(() => {
          if (!controls.dragging) controls.dragged = false;
        }, 0);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current || !controls.userControl) return;
      // While a section panel is open, leave arrows to the dialog / trap.
      if (focusedRef?.current?.value) return;
      if (controls.lookAnimating) interruptLook();
      const step = LOOK_KEY_STEP;
      if (e.key === 'ArrowLeft') {
        controls.lookTarget.x = wrapYaw(controls.lookTarget.x + step);
        controls.velocity.x = 0;
      } else if (e.key === 'ArrowRight') {
        controls.lookTarget.x = wrapYaw(controls.lookTarget.x - step);
        controls.velocity.x = 0;
      } else if (e.key === 'ArrowUp') {
        controls.lookTarget.y = clampPitch(controls.lookTarget.y + step);
        controls.velocity.y = 0;
      } else if (e.key === 'ArrowDown') {
        controls.lookTarget.y = clampPitch(controls.lookTarget.y - step);
        controls.velocity.y = 0;
      } else if (e.key === '+' || e.key === '=') {
        controls.mfov = Math.max(MFOV_MIN, controls.mfov - MOUSE_FOV_CHANGE * 3);
        controls.lookTarget.y = clampPitch(controls.lookTarget.y);
      } else if (e.key === '-' || e.key === '_') {
        controls.mfov = Math.min(MFOV_MAX, controls.mfov + MOUSE_FOV_CHANGE * 3);
        controls.lookTarget.y = clampPitch(controls.lookTarget.y);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!enabledRef.current || !controls.userControl) return;
      // Panel lives inside `.stage` — don't steal wheel from glass scroll.
      if (focusedRef?.current?.value) return;
      const t = e.target;
      if (t instanceof Element && t.closest('.panel, .panel-root, .panel-nest-sheet')) {
        return;
      }
      interruptLook();
      e.preventDefault();
      const delta =
        Math.sign(e.deltaY) * MOUSE_FOV_CHANGE * Math.min(8, Math.abs(e.deltaY) / 40);
      controls.mfov = Math.min(MFOV_MAX, Math.max(MFOV_MIN, controls.mfov + delta));
      controls.lookTarget.y = clampPitch(controls.lookTarget.y);
    };

    const pinchDist = (t: TouchList) => {
      const a = t[0];
      const b = t[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!enabledRef.current || !controls.userControl) return;
      if (e.touches.length === 2) {
        pinchActive = true;
        controls.dragging = false;
        controls.dragged = false;
        pinchStartDist = pinchDist(e.touches);
        pinchStartMfov = controls.mfov;
        interruptLook();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pinchActive || e.touches.length < 2) return;
      e.preventDefault();
      const d = pinchDist(e.touches);
      if (pinchStartDist < 1) return;
      // Spread fingers → zoom in (smaller MFOV)
      const delta = (pinchStartDist - d) * PINCH_FOV_SCALE;
      controls.mfov = Math.min(
        MFOV_MAX,
        Math.max(MFOV_MIN, pinchStartMfov + delta),
      );
      controls.lookTarget.y = clampPitch(controls.lookTarget.y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchActive = false;
      }
    };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);
    stage.addEventListener('touchcancel', onTouchEnd);

    return () => {
      killFollowTweens();
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [stageRef, enabledRef, onDragEndRef, onInterruptLookRef, focusedRef, controls]);

  return controls;
}
