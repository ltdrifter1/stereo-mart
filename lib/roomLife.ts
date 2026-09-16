/**
 * Idle environmental life — the #1 remaining gap vs balmingtiger.com.
 *
 * BT’s room never sits still. Stereo-Mart already had lookto / glove / gate;
 * at rest the shop was a painting. These loops are Stereo-Mart originals
 * (plate patches + v20 props), never BT art.
 */
import { SPHERE_RADIUS, athAtvToUv } from '@/lib/pano';

/** Billboard width for an angular span at the life-layer radius. */
export function angToPlane(deg: number, radius = SPHERE_RADIUS - 0.9): number {
  return 2 * radius * Math.tan(((deg * Math.PI) / 180) / 2);
}

export const LIFE_INSET = 0.9;

export const FAN_LIFE = {
  ath: -9.09,
  atv: -60.95,
  wdeg: 54,
  hdeg: 54,
  /** Slow Ghibli turn — one rev ~28s. */
  radPerSec: 0.22,
  coverSrc: '/hotspots/life/fan_cover.webp',
  src: '/hotspots/life/fan.webp',
} as const;

export const SPEAKER_LIFE = {
  ath: -114,
  atv: 20.35,
  wdeg: 10.72,
  hdeg: 10.72,
  idleHz: 0.75,
  idleAmp: 0.016,
  listenHz: 2.4,
  listenAmp: 0.038,
  src: '/hotspots/life/speaker_cone.webp',
} as const;

export const CAT_LIFE = {
  ath: -163.36,
  atv: 23.91,
  wdeg: 28.59,
  hdeg: 18.28,
  breatheUp: 2.4,
  breatheDown: 2.6,
  scale: 1.015,
  src: '/hotspots/life/cat_patch.webp',
} as const;

/** Storefront glass sky — ath 0 faces the window. */
export const CLOUD_WINDOW = {
  athMin: -38,
  athMax: 38,
  atvMin: -34,
  atvMax: -22,
} as const;

export const CLOUD_LIFE = [
  {
    id: 'cloud_a',
    src: '/hotspots/life/cloud_a.webp',
    ath: -28,
    atv: -30,
    wdeg: 22,
    hdeg: 11.5,
    degPerSec: 1.15,
    phase: 0.2,
  },
  {
    id: 'cloud_b',
    src: '/hotspots/life/cloud_b.webp',
    ath: -6,
    atv: -26.5,
    wdeg: 18,
    hdeg: 9.5,
    degPerSec: 0.85,
    phase: 1.4,
  },
  {
    id: 'cloud_c',
    src: '/hotspots/life/cloud_c.webp',
    ath: 18,
    atv: -31,
    wdeg: 15,
    hdeg: 8,
    degPerSec: 1.4,
    phase: 2.8,
  },
] as const;

export const LAMP_FLICKER = {
  src: '/hotspots/life/lamp_pool.png',
  wdeg: 10,
  hdeg: 10,
  base: 0.22,
  /** Mean seconds between a single dip. */
  minGap: 25,
  maxGap: 75,
} as const;

export const LOOKTO_SWELL = {
  peakMul: 1.55,
  attack: 0.45,
  release: 1.15,
} as const;

export function lifeUv(ath: number, atv: number) {
  return athAtvToUv(ath, atv);
}

/** Wrap a drifting cloud back across the storefront glass. */
export function wrapCloudAth(ath: number): number {
  const { athMin, athMax } = CLOUD_WINDOW;
  const span = athMax - athMin;
  let a = ath;
  while (a > athMax) a -= span;
  while (a < athMin) a += span;
  return a;
}

/** 0 at the mullions, 1 in the middle of the glass. */
export function cloudWindowFade(ath: number): number {
  const { athMin, athMax } = CLOUD_WINDOW;
  const mid = (athMin + athMax) / 2;
  const half = (athMax - athMin) / 2;
  const t = 1 - Math.abs(ath - mid) / half;
  return Math.max(0, Math.min(1, (t - 0.08) / 0.92));
}
