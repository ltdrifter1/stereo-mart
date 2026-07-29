/**
 * Hotspot glow tuning — the single place to adjust after new `*_edge.webp`
 * maps drop into public/hotspots/. Swap the files, then tune here.
 */
export const GLOW = {
  /** Warm gold rim — balmingtiger hover glow (cream). */
  edgeTint: '#ffe9a8',
  /** Amber outer aura behind the rim. */
  bloomTint: '#ffd27a',
  /** Bloom quad size vs the rim quad — spreads aura past the silhouette. */
  bloomScale: 1.14,
  /** Hover fade in/out duration (s). */
  hoverFade: 0.4,
  /** Breath speed (rad/s of the sine wave) while hovered / focused. */
  breathSpeed: 1.4,
  /** Slower breath while only idling (free-look whisper). */
  idleBreathSpeed: 1.05,
  /** Rim opacity = edgeBase + wave * edgeAmp. */
  edgeBase: 0.82,
  edgeAmp: 0.32,
  /** Bloom opacity = bloomBase + wave * bloomAmp. */
  bloomBase: 0.28,
  bloomAmp: 0.24,
  /** Scale swell of rim / bloom quads at breath peak. */
  edgeSwell: 0.025,
  bloomSwell: 0.035,
  /**
   * Free-look idle rim floor — always-on diegetic cue that objects are live.
   * Phone has no hover; this is how visitors find hotspots after settle.
   */
  idleBase: 0.22,
  /** Idle breath amplitude on top of idleBase. */
  idleAmp: 0.1,
  /** While a panel is open, non-focused hotspots dim by this multiplier. */
  idlePanelMul: 0.16,
  /** Extra alpha during the post-settle boost window. */
  settleBoost: 0.42,
  /** Music booth while a preview is live — faster, brighter pulse. */
  listeningBreathSpeed: 2.2,
  listeningEdgeAmp: 0.42,
  listeningBloomAmp: 0.34,
  listeningSwell: 0.045,
  /** Morphological erode radius (px) converting a filled map into a rim. */
  erodePx: 6,
} as const;
