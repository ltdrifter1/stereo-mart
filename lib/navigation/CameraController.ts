import {
  MFOV_EXPLORE,
  MFOV_LOOKTO_MIN,
  MFOV_MAX,
  MFOV_MIN,
  MFOV_RATIO,
  START_LOOK_U,
  START_LOOK_V,
  WALK_DOLLY_MAX,
  uToYaw,
  vToPitch,
  uvToSpherical,
} from '@/lib/pano';
import type { Section } from '@/app/data/sections';
import { adaptMfovToViewport, measureViewport } from './ViewportManager';
import type { Controls, LookTarget, Vec3, ViewportMetrics } from './types';

export { measureViewport };

/**
 * Create the shared mutable Controls object (one per Experience mount).
 */
export function createControls(initial?: Partial<Controls>): Controls {
  return {
    lookTarget: { x: uToYaw(START_LOOK_U), y: vToPitch(START_LOOK_V) },
    velocity: { x: 0, y: 0 },
    dragging: false,
    dragged: false,
    mfov: MFOV_EXPLORE,
    fisheye: 0.3,
    pointer: { x: 0, y: 0 },
    followFactor: 0,
    userControl: false,
    lookAnimating: false,
    eye: { x: 0, y: 0, z: 0 },
    ...initial,
  };
}

/**
 * Explore MFOV for the live viewport — keeps design HFOV (~132°) on portrait
 * so the room doesn’t tunnel / feel compressed on phones.
 */
export function resolveExploreMfov(viewport?: ViewportMetrics): number {
  const vp = viewport ?? measureViewport();
  const aspect = Math.max(0.05, vp.aspect);
  const mfov =
    aspect >= MFOV_RATIO
      ? MFOV_EXPLORE
      : adaptMfovToViewport(MFOV_EXPLORE, aspect);
  return Math.min(MFOV_MAX, Math.max(MFOV_MIN, mfov));
}

export function readCamera(controls: Controls): LookTarget {
  return {
    yaw: controls.lookTarget.x,
    pitch: controls.lookTarget.y,
    mfov: controls.mfov,
    eye: { ...controls.eye },
  };
}

export function writeCamera(controls: Controls, cam: Partial<LookTarget>) {
  if (cam.yaw != null) controls.lookTarget.x = cam.yaw;
  if (cam.pitch != null) controls.lookTarget.y = cam.pitch;
  if (cam.mfov != null) controls.mfov = cam.mfov;
  if (cam.eye) {
    controls.eye.x = cam.eye.x;
    controls.eye.y = cam.eye.y;
    controls.eye.z = cam.eye.z;
  }
}

export function snapExploreFront(controls: Controls, viewport?: ViewportMetrics) {
  controls.lookTarget.x = uToYaw(START_LOOK_U);
  controls.lookTarget.y = vToPitch(START_LOOK_V);
  controls.mfov = resolveExploreMfov(viewport);
  controls.velocity.x = 0;
  controls.velocity.y = 0;
  controls.eye.x = 0;
  controls.eye.y = 0;
  controls.eye.z = 0;
}

/**
 * Lookto MFOV — one engine, all devices.
 *
 * Desktop / landscape: use the authored lookFov (already tuned).
 * Portrait: remap so horizontal FOV matches the design framing
 * (fixes iPhone over-zoom without hardcoded per-section mobile coords).
 */
export function resolveLookMfov(
  section: Pick<Section, 'w' | 'h' | 'lookFov'>,
  viewport: ViewportMetrics,
): number {
  const aspect = Math.max(0.05, viewport.aspect);
  const authored = section.lookFov;

  let mfov: number;
  if (aspect >= MFOV_RATIO) {
    // Landscape-ish — keep author values (desktop feel was correct).
    mfov = authored;
  } else {
    // Portrait — preserve design horizontal FOV.
    mfov = adaptMfovToViewport(authored, aspect);
  }

  return Math.min(MFOV_MAX, Math.max(MFOV_LOOKTO_MIN, mfov));
}

/** Unit look direction matching Rig YXZ forward. */
export function lookDirection(yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cp,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cp,
  };
}

/** Eye offset toward a feature — capped so the sphere doesn’t clip. */
export function eyeTowardUv(u: number, v: number, dolly: number): Vec3 {
  const d = Math.max(0, Math.min(WALK_DOLLY_MAX, dolly));
  if (d < 0.01) return { x: 0, y: 0, z: 0 };
  const [x, y, z] = uvToSpherical(u, v, 1);
  return { x: x * d, y: y * d, z: z * d };
}

/** World aim for a section — same UV on every device, with walk dolly. */
export function resolveLookTarget(
  section: Pick<
    Section,
    'u' | 'v' | 'lookU' | 'lookV' | 'w' | 'h' | 'lookFov' | 'walkDolly'
  >,
  viewport?: ViewportMetrics,
): LookTarget {
  const vp = viewport ?? measureViewport();
  const lu = section.lookU ?? section.u;
  const lv = section.lookV ?? section.v;
  return {
    yaw: uToYaw(lu),
    pitch: vToPitch(lv),
    mfov: resolveLookMfov(section, vp),
    eye: eyeTowardUv(lu, lv, section.walkDolly ?? 0),
  };
}

export function frontLookTarget(viewport?: ViewportMetrics): LookTarget {
  return {
    yaw: uToYaw(START_LOOK_U),
    pitch: vToPitch(START_LOOK_V),
    mfov: resolveExploreMfov(viewport),
    eye: { x: 0, y: 0, z: 0 },
  };
}

/**
 * Mid-aisle waypoint between two aims — step back to center, ease the turn,
 * then the final lookto approaches the wall. Makes section hops feel like walks.
 */
export function aisleWaypoint(
  fromYaw: number,
  to: LookTarget,
  viewport?: ViewportMetrics,
): LookTarget {
  const explore = resolveExploreMfov(viewport);
  // Shortest-path mid yaw
  let d = to.yaw - fromYaw;
  const TWO_PI = Math.PI * 2;
  d = ((((d + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
  return {
    yaw: fromYaw + d * 0.45,
    pitch: to.pitch * 0.35,
    mfov: Math.min(explore, Math.max(to.mfov + 18, explore * 0.88)),
    eye: { x: 0, y: 0, z: 0 },
  };
}
