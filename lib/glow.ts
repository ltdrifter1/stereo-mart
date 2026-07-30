/**
 * Hotspot glow tuning — the single place to adjust after new `*_edge.webp`
 * maps drop into public/hotspots/. Swap the files, then tune here.
 */
export const GLOW = {
  /** Cool silver rim — balmingtiger hover glow (oxidized cream). */
  edgeTint: '#e8f0f4',
  /** Muted blue-silver outer aura behind the rim. */
  bloomTint: '#9bb4c4',
  /** Bloom quad size vs the rim quad — spreads aura past the silhouette. */
  bloomScale: 1.18,
  /** Hover fade in/out duration (s). */
  hoverFade: 0.4,
  /** Breath speed (rad/s of the sine wave) while hovered / focused. */
  breathSpeed: 1.35,
  /** Slower breath while only idling (free-look whisper). */
  idleBreathSpeed: 1.0,
  /** Rim opacity = edgeBase + wave * edgeAmp. */
  edgeBase: 0.92,
  edgeAmp: 0.28,
  /** Bloom opacity = bloomBase + wave * bloomAmp. */
  bloomBase: 0.36,
  bloomAmp: 0.26,
  /** Scale swell of rim / bloom quads at breath peak. */
  edgeSwell: 0.022,
  bloomSwell: 0.04,
  /**
   * Free-look idle rim floor — always-on diegetic cue that objects are live.
   * Phone has no hover; this is how visitors find hotspots after settle.
   */
  idleBase: 0.32,
  /** Idle breath amplitude on top of idleBase. */
  idleAmp: 0.12,
  /** While a panel is open, non-focused hotspots dim by this multiplier. */
  idlePanelMul: 0.18,
  /** Extra alpha during the post-settle boost window. */
  settleBoost: 0.48,
  /** Music booth while a preview is live — faster, brighter pulse. */
  listeningBreathSpeed: 2.2,
  listeningEdgeAmp: 0.4,
  listeningBloomAmp: 0.36,
  listeningSwell: 0.045,
  /** Morphological erode radius (px) converting a filled map into a rim. */
  erodePx: 6,
} as const;
