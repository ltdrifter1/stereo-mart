import { MOTION } from '@/lib/motion';

/**
 * Hotspot glow — BT hover aura (soft lamp-light), never a HUD ring.
 * Rest pose: objects look painted. Hover / focus: warm wash.
 */
export const GLOW = {
  /** Warm cream wash over the painted object. */
  edgeTint: '#ece4d2',
  /** Soft yellow outer aura. */
  bloomTint: '#ffe566',
  /** Bloom quad vs hit plane — slight overspill, not a halo ring. */
  bloomScale: 1.18,
  /** Hover fade in/out duration (s) — BT hoverIn/Out 0.4 power1.inOut. */
  hoverFade: MOTION.hoverAura,
  /** Breath speed (rad/s of the sine wave) while hovered / focused. */
  breathSpeed: 1.35,
  idleBreathSpeed: 0.7,
  /** Peak additive opacity on hover (keep low — rings start above ~0.6). */
  hoverAlpha: 0.52,
  focusedAlpha: 0.62,
  edgeBase: 0.55,
  edgeAmp: 0.18,
  bloomBase: 0.42,
  bloomAmp: 0.16,
  edgeSwell: 0.016,
  bloomSwell: 0.028,
  /**
   * Rest pose is painted — no idle HUD markers (BT room rest).
   * Phone still has the conveyor / stacked menu.
   */
  idleBase: 0,
  idleAmp: 0,
  idlePanelMul: 0.12,
  /** Brief post-enter whisper, then gone. */
  settleBoost: 0.14,
  listeningBreathSpeed: 1.8,
  listeningEdgeAmp: 0.22,
  listeningBloomAmp: 0.2,
  listeningSwell: 0.03,
  erodePx: 6,
} as const;
