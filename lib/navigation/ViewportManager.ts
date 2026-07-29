import {
  MFOV_RATIO,
  mfovToHorizontalFov,
  mfovToVerticalFov,
} from '@/lib/pano';
import type { ViewportMetrics } from './types';

/** Authored lookFov values were tuned on a landscape storefront frame. */
export const DESIGN_ASPECT = 16 / 9;

const DEFAULT: ViewportMetrics = {
  width: 1280,
  height: 720,
  aspect: DESIGN_ASPECT,
  dpr: 1,
  offsetTop: 0,
  offsetLeft: 0,
  safeTop: 0,
  safeRight: 0,
  safeBottom: 0,
  safeLeft: 0,
  safeMarginX: 0.1,
  safeMarginY: 0.14,
};

function readSafeInset(side: 'top' | 'right' | 'bottom' | 'left'): number {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return 0;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--sat-${side}`)
    .trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Live viewport metrics — visualViewport on iOS Safari, stage box otherwise.
 * One model for desktop / tablet / phone; only the numbers change.
 */
export function measureViewport(stage?: HTMLElement | null): ViewportMetrics {
  if (typeof window === 'undefined') return { ...DEFAULT };

  const vv = window.visualViewport;
  const width = Math.max(
    1,
    vv?.width ?? stage?.clientWidth ?? window.innerWidth,
  );
  const height = Math.max(
    1,
    vv?.height ?? stage?.clientHeight ?? window.innerHeight,
  );
  const offsetTop = vv?.offsetTop ?? 0;
  const offsetLeft = vv?.offsetLeft ?? 0;
  const dpr = Math.min(3, window.devicePixelRatio || 1);

  const safeTop = readSafeInset('top');
  const safeRight = readSafeInset('right');
  const safeBottom = readSafeInset('bottom');
  const safeLeft = readSafeInset('left');

  // Chrome reserves: top/bottom nav + glass panel. Normalized, not px hacks.
  const chromeY = Math.min(0.28, (64 + safeBottom + safeTop) / height);
  const chromeX = Math.min(0.16, (24 + safeLeft + safeRight) / width);

  return {
    width,
    height,
    aspect: width / height,
    dpr,
    offsetTop,
    offsetLeft,
    safeTop,
    safeRight,
    safeBottom,
    safeLeft,
    safeMarginX: Math.max(0.06, chromeX),
    safeMarginY: Math.max(0.1, chromeY),
  };
}

/** Write CSS vars so viewport-attached FX (glow edge / vignette) stay locked. */
export function syncViewportCssVars(metrics: ViewportMetrics, root?: HTMLElement) {
  const el = root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;
  el.style.setProperty('--vv-width', `${metrics.width}px`);
  el.style.setProperty('--vv-height', `${metrics.height}px`);
  el.style.setProperty('--vv-top', `${metrics.offsetTop}px`);
  el.style.setProperty('--vv-left', `${metrics.offsetLeft}px`);
  el.style.setProperty('--vv-dpr', String(metrics.dpr));
}

/**
 * Convert horizontal FOV → MFOV for the current aspect (inverse of mfovToHorizontalFov).
 */
export function horizontalFovToMfov(hfovDeg: number, aspect: number): number {
  if (aspect >= MFOV_RATIO) {
    // Landscape-ish: HFOV ≡ MFOV
    return hfovDeg;
  }
  // Portrait: VFOV ≡ MFOV, HFOV = 2atan(tan(V/2)*aspect)
  const h = ((hfovDeg * Math.PI) / 180) / 2;
  const denom = Math.max(0.05, aspect);
  return (2 * Math.atan(Math.tan(h) / denom) * 180) / Math.PI;
}

export function verticalFovToMfov(vfovDeg: number, aspect: number): number {
  if (aspect < MFOV_RATIO) {
    // Portrait: VFOV ≡ MFOV
    return vfovDeg;
  }
  // Landscape: HFOV ≡ MFOV, VFOV = 2atan(tan(H/2)/aspect)
  const v = ((vfovDeg * Math.PI) / 180) / 2;
  return (2 * Math.atan(Math.tan(v) * aspect) * 180) / Math.PI;
}

/**
 * Remap an authored MFOV so the visible horizontal field matches DESIGN_ASPECT.
 * This is what fixed balmingtiger's crude "video FOV 20→40 on mobile" hack —
 * portrait no longer over-zooms when the same world target is framed.
 */
export function adaptMfovToViewport(designMfov: number, viewAspect: number): number {
  const designHfov = mfovToHorizontalFov(designMfov, DESIGN_ASPECT);
  return horizontalFovToMfov(designHfov, viewAspect);
}

export function viewportVerticalFov(mfov: number, aspect: number) {
  return mfovToVerticalFov(mfov, aspect);
}

export function viewportHorizontalFov(mfov: number, aspect: number) {
  return mfovToHorizontalFov(mfov, aspect);
}
