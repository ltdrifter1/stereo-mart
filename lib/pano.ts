/**
 * Shared geometry + view/control constants for the 360° store.
 *
 * Matched to balmingtiger.com (krpano 1.20.10 + vtourskin):
 *
 *   <view hlookat="0" vlookat="0" fovtype="MFOV" fov="120"
 *         fovmin="70" fovmax="140" maxpixelzoom="2.0"
 *         limitview="auto" fisheye="0.3" />
 *   <control mouse="drag" touch="drag"
 *            draginertia="0.1" dragfriction="0.9"
 *            mousefovchange="1.0" />
 *   skin_settings followmousecontrol="true"
 *     → followrange=10, followspeed=0.05
 *
 * Enter (site_scripts.js clickIntro + little-planet-style settle):
 *   start near ceiling → soft yaw pan → land on LISTEN wall (headphones)
 *   while fisheye 1→0.3 and fov 160→intro-settle (~128) over ~3s,
 *   then ease to portrait-aware explore for free-look.
 */
/** Equirect source — upscaled 4K for cleaner lookto FOV~20 punch-ins. */
export const PANO_WIDTH = 4096;
export const PANO_HEIGHT = 2048;
export const PANO_ASPECT = PANO_WIDTH / PANO_HEIGHT;

export const SPHERE_RADIUS = 48;

/** krpano view.mfovratio default (4:3). */
export const MFOV_RATIO = 4 / 3;

/**
 * Explore MFOV — widened for STEREO-MART's denser room so architecture reads larger
 * and more of the ceiling / floor sightline remains visible.
 */
export const MFOV_EXPLORE = 132;
export const MFOV_INTRO = 160;
/**
 * Device-agnostic cinematic settle FOV for enter (not portrait-adapted).
 * Portrait explore can land ~157° — only ~3° of zoom — so intro must
 * settle here first, then ease into resolveExploreMfov for free-look.
 */
/** Slightly wider settle so the empty shop reads as a room on enter. */
export const MFOV_INTRO_SETTLE = 128;
/**
 * Free-look wheel clamp (krpano fovmin/fovmax).
 * lookto may punch below this (video ~20) — wheel/keys stay in this range.
 */
export const MFOV_MIN = 70;
/** Allows portrait to preserve the authored 132° horizontal explore view. */
export const MFOV_MAX = 160;
/** Absolute floor for lookto punch-ins (video). */
export const MFOV_LOOKTO_MIN = 20;

/** Steady-state + intro fisheye (krpano view.fisheye). */
export const FISHEYE_EXPLORE = 0.3;
export const FISHEYE_INTRO = 1.0;

/**
 * Enter tween — ceiling drop → soft yaw pan → aisle middle.
 * INTRO_DELAY aligned so the FOV/planet beat starts as the gate clears (~0.4s).
 */
export const GATE_FADE_DUR = 0.4;
export const INTRO_DELAY = 0.45;
export const INTRO_DUR = 3.0;
/** Post-settle ease from cinematic FOV → portrait-aware explore. */
export const INTRO_EXPLORE_EASE_DUR = 0.85;
/** Short path when prefers-reduced-motion (tilt only, still readable). */
export const INTRO_REDUCED_DUR = 0.65;
/**
 * Pre-enter / drop pose: looking almost straight UP at the ceiling so
 * CLICK TO ENTER reveals a little-planet swirl, then tilts down into
 * the middle of the aisle (BT clickIntro ceiling → settle).
 * Kept just off the exact zenith to avoid equirect pole smearing.
 */
export const INTRO_DROP_V = 0.1;
/** Soft yaw sweep (degrees) during the tilt — room reads as a place, not a still. */
export const INTRO_PAN_DEG = 38;
/**
 * Base view — aisle toward the back-wall LISTEN station (headphones +
 * turntable), bins kept in the lower third. v=0.5 aimed into the island
 * face and felt like starting inside a record bin on the v13 pano.
 */
/** Center of the aisle after BackSide U-flip (texture u ↔ 1−u). */
export const START_LOOK_U = 0.5;
/** Slightly above level — framed on the LISTEN wall, not the bin tops. */
export const START_LOOK_V = 0.38;

/**
 * krpano vtourskin defaults:
 *   draginertia="0.1"  — higher ⇒ less leftover momentum
 *   dragfriction="0.9" — lower ⇒ stops quicker (per-frame at 60fps)
 */
export const DRAG_INERTIA = 0.1;
export const DRAG_FRICTION = 0.9;
export const FRICTION_STOP = 0.002;

/** control.mousefovchange — degrees of MFOV per wheel "notch" scale. */
export const MOUSE_FOV_CHANGE = 1.0;

/**
 * followmousecontrol (vtourskin skin_followmouse_init):
 *   followrange=10 (degrees), followspeed=0.05
 * On mousedown: followfactor → 0 in 0.2s
 * On mouseup: after 1s, followfactor → 1 over 3s
 */
export const FOLLOW_RANGE_DEG = 10;
export const FOLLOW_SPEED = 0.05;
export const FOLLOW_OFF_DUR = 0.2;
export const FOLLOW_REENABLE_DELAY = 1.0;
export const FOLLOW_REENABLE_DUR = 3.0;

export const LOOK_KEY_STEP = 0.09; // ≈ keybaccelerate feel per tap

/**
 * MFOV (degrees) → Three.js vertical FOV for this aspect.
 * Uses krpano's mfovratio (4/3): compare width vs height*mfovratio.
 */
export function mfovToVerticalFov(mfovDeg: number, aspect: number): number {
  const m = ((mfovDeg * Math.PI) / 180) / 2;
  const widthIsLonger = aspect >= MFOV_RATIO;
  if (widthIsLonger) {
    // Longer axis is width → HFOV = mfov, derive VFOV from aspect
    return (2 * Math.atan(Math.tan(m) / aspect) * 180) / Math.PI;
  }
  // Longer axis is (mfovratio-scaled) height → VFOV = mfov
  return mfovDeg;
}

/** Horizontal FOV (degrees) implied by current MFOV + aspect. */
export function mfovToHorizontalFov(mfovDeg: number, aspect: number): number {
  const vfov = mfovToVerticalFov(mfovDeg, aspect);
  if (aspect >= MFOV_RATIO) return mfovDeg;
  const v = ((vfov * Math.PI) / 180) / 2;
  return (2 * Math.atan(Math.tan(v) * aspect) * 180) / Math.PI;
}

/**
 * limitview="auto" pitch clamp for a full sphere:
 * keep the view inside ±90° given the current VFOV.
 */
export function autoPitchLimit(mfovDeg: number, aspect: number): number {
  const vfov = (mfovToVerticalFov(mfovDeg, aspect) * Math.PI) / 180;
  return Math.max(0.05, Math.PI / 2 - vfov / 2 - 0.02);
}

/**
 * followmouse zoomscale = max(1, 1/tan(vfov/2))
 * Stronger lean when zoomed in, subdued at wide MFOV.
 */
export function followZoomScale(mfovDeg: number, aspect: number): number {
  const vfov = (mfovToVerticalFov(mfovDeg, aspect) * Math.PI) / 180;
  const z = 1 / Math.tan(Math.max(0.05, vfov / 2));
  return Math.max(1, z);
}

/**
 * Equirect U → camera yaw (radians).
 *
 * Authored convention (sections.ts / cash-register comments):
 *   spherical_u = 1 − file_u
 *   → looking at `u` must sample pano file_u = 1 − u
 *
 * Three.js SphereGeometry + BackSide + texture.repeat.x = −1 needs a
 * −π/2 yaw phase so that convention holds. Without it, Music lookto at
 * u≈0.17 aimed at the poster wall (file≈0.58) instead of the Listening
 * Station (file≈0.83), and Videos missed the CRT.
 */
export function uToYaw(u: number): number {
  return (u - 0.5) * Math.PI * 2 - Math.PI / 2;
}

export function vToPitch(v: number): number {
  return (0.5 - v) * Math.PI;
}

/**
 * World position on the inside of the equirect sphere for authored UV.
 * Must match the camera forward at `rotation.y = uToYaw(u)`,
 * `rotation.x = vToPitch(v)` (YXZ) so hotspots sit on what lookto frames.
 */
export function uvToSpherical(
  u: number,
  v: number,
  radius: number = SPHERE_RADIUS,
): [number, number, number] {
  const yaw = uToYaw(u);
  const pitch = vToPitch(v);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  // Camera forward with YXZ at (yaw, pitch): Ry*Rx*(0,0,-1)
  return [
    -sy * cp * radius,
    sp * radius,
    -cy * cp * radius,
  ];
}

export function uvToLocal(u: number, v: number): [number, number, number] {
  return uvToSpherical(u, v, SPHERE_RADIUS - 0.35);
}

/** v15 — STEREO-MART late-90s analog VHS/cassette shop equirect. */
export const TEXTURE_SRC = '/textures/store_pano_v15.webp';
/** Darkened twin of the store — lights_off scene. */
export const TEXTURE_OFF_SRC = '/textures/store_pano_off_v15.webp';
export const LQIP_SRC = '/textures/store_pano_lqip_v15.webp';
export const CRT_VIDEO_SRC = '/videos/channel_b.mp4';

/** Max eye offset from sphere center (walk approach). */
export const WALK_DOLLY_MAX = 12;
