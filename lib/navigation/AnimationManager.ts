import type { Controls, LookTarget, Vec3 } from './types';

const TWO_PI = Math.PI * 2;

/** Shortest-path yaw delta into (−π, π]. */
export function yawDelta(from: number, to: number) {
  let d = (to - from) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}

/** ≈ krpano / GSAP easeinoutquart */
export function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

type AnimHandle = {
  kill: () => void;
};

let active: {
  id: number;
  raf: number;
  onInterrupt?: () => void;
} | null = null;

/**
 * Kill any in-flight camera tween and unlock lookAnimating.
 * Returns true if something was interrupted.
 */
export function interruptCameraAnimation(controls: Controls) {
  if (!active && !controls.lookAnimating) return false;
  if (active) {
    cancelAnimationFrame(active.raf);
    active.onInterrupt?.();
    active = null;
  }
  controls.lookAnimating = false;
  controls.velocity.x = 0;
  controls.velocity.y = 0;
  return true;
}

function lerpEye(a: Vec3, b: Vec3, e: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * e,
    y: a.y + (b.y - a.y) * e,
    z: a.z + (b.z - a.z) * e,
  };
}

/**
 * Animate yaw / pitch / mfov / eye on rAF.
 * Never uses browser scroll or anchor jumps — pure transform interpolation.
 */
export function animateCamera(
  controls: Controls,
  to: LookTarget,
  opts: {
    duration?: number;
    ease?: (t: number) => number;
    onComplete?: () => void;
    onUpdate?: () => void;
  } = {},
): AnimHandle {
  const duration = Math.max(0.01, opts.duration ?? 1.55) * 1000;
  const ease = opts.ease ?? easeInOutQuart;

  interruptCameraAnimation(controls);
  controls.velocity.x = 0;
  controls.velocity.y = 0;
  controls.lookAnimating = true;
  controls.followFactor = 0;

  const startYaw = controls.lookTarget.x;
  const startPitch = controls.lookTarget.y;
  const startMfov = controls.mfov;
  const startEye: Vec3 = { ...controls.eye };
  const endEye: Vec3 = to.eye ? { ...to.eye } : startEye;
  const delta = yawDelta(startYaw, to.yaw);
  const id = Date.now() + Math.random();
  const t0 = performance.now();

  const tick = (now: number) => {
    if (!active || active.id !== id) return;
    const u = Math.min(1, (now - t0) / duration);
    const e = ease(u);
    controls.lookTarget.x = startYaw + delta * e;
    controls.lookTarget.y = startPitch + (to.pitch - startPitch) * e;
    controls.mfov = startMfov + (to.mfov - startMfov) * e;
    const eye = lerpEye(startEye, endEye, e);
    controls.eye.x = eye.x;
    controls.eye.y = eye.y;
    controls.eye.z = eye.z;
    opts.onUpdate?.();

    if (u < 1) {
      active.raf = requestAnimationFrame(tick);
      return;
    }

    controls.lookTarget.x = to.yaw;
    controls.lookTarget.y = to.pitch;
    controls.mfov = to.mfov;
    controls.eye.x = endEye.x;
    controls.eye.y = endEye.y;
    controls.eye.z = endEye.z;
    controls.lookAnimating = false;
    active = null;
    opts.onComplete?.();
  };

  active = {
    id,
    raf: requestAnimationFrame(tick),
    onInterrupt: () => {
      controls.lookAnimating = false;
    },
  };

  return {
    kill: () => interruptCameraAnimation(controls),
  };
}

/**
 * Multi-stop walk path — e.g. aisle midpoint then wall approach.
 * Durations are per segment; total ≈ sum(segmentDurations).
 */
export function animateCameraPath(
  controls: Controls,
  path: LookTarget[],
  opts: {
    segmentDurations?: number[];
    onComplete?: () => void;
  } = {},
): AnimHandle {
  if (path.length === 0) {
    opts.onComplete?.();
    return { kill: () => undefined };
  }
  if (path.length === 1) {
    return animateCamera(controls, path[0], {
      duration: opts.segmentDurations?.[0] ?? 1.8,
      onComplete: opts.onComplete,
    });
  }

  let killed = false;
  let handle: AnimHandle | null = null;
  let i = 0;

  const runNext = () => {
    if (killed) return;
    if (i >= path.length) {
      opts.onComplete?.();
      return;
    }
    const dur =
      opts.segmentDurations?.[i] ??
      (i === 0 ? 0.85 : 1.35);
    const idx = i;
    i += 1;
    handle = animateCamera(controls, path[idx], {
      duration: dur,
      onComplete: runNext,
    });
  };

  runNext();

  return {
    kill: () => {
      killed = true;
      handle?.kill();
    },
  };
}
