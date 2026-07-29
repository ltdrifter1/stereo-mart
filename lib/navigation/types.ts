/**
 * Shared navigation / camera types.
 *
 * This is a 360° spherical camera (balmingtiger / krpano model), not a 2D
 * CSS transform canvas. Mapping to the requested camera vocabulary:
 *
 *   cameraX     → lookTarget.x  (yaw, radians)
 *   cameraY     → lookTarget.y  (pitch, radians)
 *   cameraScale → mfov          (degrees; smaller = more zoomed in)
 *
 * Soft close clears focus without moving the camera (BT BACK).
 * CRT drag-end calls resetToFront (BT video Observer).
 */

export type Vec2 = { x: number; y: number };

export type Vec3 = { x: number; y: number; z: number };

export type CameraState = {
  /** cameraX — yaw in radians (wraps). */
  yaw: number;
  /** cameraY — pitch in radians (clamped by ViewportManager). */
  pitch: number;
  /** cameraScale — MFOV degrees (krpano view.fov, fovtype=MFOV). */
  mfov: number;
};

/**
 * Mutable look state shared between InteractionManager and the camera Rig.
 * Mirrors the krpano view + control surface balmingtiger drives.
 */
export type Controls = {
  lookTarget: Vec2;
  velocity: Vec2;
  dragging: boolean;
  dragged: boolean;
  mfov: number;
  fisheye: number;
  pointer: Vec2;
  followFactor: number;
  userControl: boolean;
  /**
   * True while a lookto / FOV tween is in flight.
   * Drag may still interrupt (intentional BT parity).
   */
  lookAnimating: boolean;
  /**
   * Eye position inside the sphere (walk approach).
   * (0,0,0) = classic pivot; non-zero = standing nearer a wall.
   */
  eye: Vec3;
};

export type ViewportMetrics = {
  width: number;
  height: number;
  aspect: number;
  dpr: number;
  /** visualViewport offset (iOS URL chrome). */
  offsetTop: number;
  offsetLeft: number;
  /** Safe-area insets in CSS pixels. */
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  safeLeft: number;
  /** Normalized margins reserved for chrome (nav / panel). */
  safeMarginX: number;
  safeMarginY: number;
};

export type LookTarget = {
  yaw: number;
  pitch: number;
  mfov: number;
  /** Optional eye position; omit to leave eye unchanged, use eye: {0,0,0} to reset. */
  eye?: Vec3;
};

export type NavFocusState = {
  activeId: string | null;
  focusedId: string | null;
  panelOpen: boolean;
  /** Ignore free-focus until lookto has landed. */
  focusReadyAt: number;
};
