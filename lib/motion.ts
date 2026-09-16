/**
 * Shared motion language for the 360 shop.
 *
 * Timing is calibrated to balmingtiger.com’s krpano/GSAP stack
 * (hover 0.4s power1.inOut, lookto 2s easeinoutquart, gate 0.4s)
 * without copying their visual identity. Stereo-Mart stays sticker-ink.
 */

export const MOTION = {
  /** Hotspot aura in/out (BT hoverIn/Out). */
  hoverAura: 0.4,
  hoverEase: 'power1.inOut',

  /** krpano lookto(..., tween(easeinoutquart, 2)). */
  lookto: 2,
  looktoAisle: 0.85,
  looktoApproach: 1.2,
  /** Panel HUD starts almost immediately so glass + camera are one gesture. */
  panelRevealDelay: 0.12,
  /** Ignore BACK taps that fire during the open click. */
  panelCloseGuardMs: 280,
  nest: 0.4,
  nestEase: 'power1.inOut',

  /** clickIntro overlay fade, then fov/fisheye ease. */
  gateFade: 0.4,
  introDelay: 0.4,
  introDur: 2,
  /** Extra beat after LOADING 100% before CLICK TO ENTER (BT loadz). */
  readyHoldDesktop: 1,
  readyHoldMobile: 1.5,
  enterButton: 0.6,

  /** Custom cursor follow — slight lerp reads smoother than 1:1 on high-Hz. */
  cursorLerp: 0.42,
  cursorRotLerp: 0.14,
  /** Screen-X tilt in degrees (BT uses ~70°; we stay restrained). */
  cursorTiltMax: 16,
  cursorHotScale: 1.06,
  cursorPressScale: 0.86,

  chrome: 0.16,
  row: 0.25,
} as const;

export type MotionEase = typeof MOTION.hoverEase;
