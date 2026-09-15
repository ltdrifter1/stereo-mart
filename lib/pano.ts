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
 * Enter (site_scripts.js clickIntro):
 *   face the storefront, fisheye 1→0.3 and fov 160→120 over ~2s,
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
 * Explore MFOV — balmingtiger.com view.fov="120" (fisheye 0.3).
 * Portrait still remaps via adaptMfovToViewport so HFOV stays honest.
 */
export const MFOV_EXPLORE = 120;
export const MFOV_INTRO = 160;
/**
 * clickIntro settle — BT eases fov 160 → 120 with the explore value.
 * Portrait then eases into resolveExploreMfov for free-look.
 */
export const MFOV_INTRO_SETTLE = 120;
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
 * Enter tween — BT clickIntro: gate fade, then fov 160→120 / fisheye 1→0.3
 * while looking at the storefront (hlookat 0). INTRO_DELAY matches the 0.4s
 * overlay fade so the swirl starts as CLICK TO ENTER clears.
 */
export const GATE_FADE_DUR = 0.4;
export const INTRO_DELAY = 0.4;
export const INTRO_DUR = 2.0;
/** Post-settle ease from cinematic FOV → portrait-aware explore. */
export const INTRO_EXPLORE_EASE_DUR = 0.85;
/** Short path when prefers-reduced-motion (still a readable tilt). */
export const INTRO_REDUCED_DUR = 0.65;
/**
 * Base view — storefront window (ath 0 on the v20 plate). Street, globe
 * decal, and record bins in the sill read as the first "you're here" beat.
 */
/** Storefront after BackSide U-flip (texture u ↔ 1−u). */
export const START_LOOK_U = 0.5;
/** Level with the OPEN door / window mid-band. */
export const START_LOOK_V = 0.48;
/**
 * Pre-enter pose matches the storefront so fisheye 1.0 reads as a room,
 * not a zenith smear. BT clickIntro does not drop from the ceiling.
 */
export const INTRO_DROP_V = START_LOOK_V;
/** No yaw swirl — BT clickIntro only eases fov/fisheye while facing the room. */
export const INTRO_PAN_DEG = 0;

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

/**
 * v20 / krpano hotspot angles → authored UV (BackSide U-flip).
 * u = 1 − (ath + 180) / 360 · v = (atv + 90) / 180
 */
export function athAtvToUv(ath: number, atv: number): { u: number; v: number } {
  const u = 1 - (ath + 180) / 360;
  const v = (atv + 90) / 180;
  return {
    u: ((u % 1) + 1) % 1,
    v: Math.max(0, Math.min(1, v)),
  };
}

/** v20 — hand-illustrated PNW/Seoul record shop (from v20/art/plates). */
export const TEXTURE_SRC = '/textures/store_pano_v20.webp';
/** Darkened twin of the store — lights_off scene. */
export const TEXTURE_OFF_SRC = '/textures/store_pano_off_v20.webp';
export const LQIP_SRC = '/textures/store_pano_lqip_v20.webp';
/**
 * Transparent FG/MG parallax layers. v20 ships empty placeholders —
 * the illustration is a single plate (no separated prop layers yet).
 */
export const TEXTURE_FG_SRC = '/textures/store_pano_fg_v20.webp';
export const TEXTURE_MG_SRC = '/textures/store_pano_mg_v20.webp';
export const CRT_VIDEO_SRC = '/videos/channel_b.mp4';

/** Max eye offset from sphere center (walk approach). */
export const WALK_DOLLY_MAX = 12;
