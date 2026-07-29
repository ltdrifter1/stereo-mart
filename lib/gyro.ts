/**
 * Mobile device-orientation look — krpano gyro plugin parity (simplified).
 * softstart="1.0" — ease offsets in over 1s when enabling (no snap).
 * Requires a user gesture on iOS 13+ (DeviceOrientationEvent.requestPermission).
 */

export type GyroHandle = {
  enabled: boolean;
  /** Radians offset applied on top of lookTarget while active. */
  yaw: number;
  pitch: number;
  /** Epoch ms when gyro was enabled — used for soft-start. */
  enabledAt: number;
};

const DEG = Math.PI / 180;
/** krpano gyro2 softstart="1.0" */
const SOFTSTART_MS = 1000;

export function createGyro(): GyroHandle {
  return { enabled: false, yaw: 0, pitch: 0, enabledAt: 0 };
}

export async function requestGyroPermission(): Promise<boolean> {
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof DOE.requestPermission === 'function') {
    try {
      const res = await DOE.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function attachGyro(handle: GyroHandle): () => void {
  let baseAlpha: number | null = null;
  let baseBeta: number | null = null;
  handle.enabledAt = performance.now();

  const onOrient = (e: DeviceOrientationEvent) => {
    if (!handle.enabled) return;
    if (e.alpha == null || e.beta == null) return;

    if (baseAlpha == null) {
      baseAlpha = e.alpha;
      baseBeta = e.beta;
      handle.enabledAt = performance.now();
    }

    // alpha: compass yaw, beta: front-back tilt
    const dAlpha = ((e.alpha - baseAlpha!) + 540) % 360 - 180;
    const dBeta = e.beta - (baseBeta ?? 0);

    const soft = smoothstep((performance.now() - handle.enabledAt) / SOFTSTART_MS);
    handle.yaw = -dAlpha * DEG * soft;
    handle.pitch = THREE_CLAMP((-dBeta * DEG) * 0.65 * soft, -0.6, 0.6);
  };

  window.addEventListener('deviceorientation', onOrient, true);
  return () => {
    window.removeEventListener('deviceorientation', onOrient, true);
    handle.enabled = false;
    handle.yaw = 0;
    handle.pitch = 0;
    handle.enabledAt = 0;
    baseAlpha = null;
    baseBeta = null;
  };
}

function THREE_CLAMP(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function isGyroLikelyAvailable() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse && 'DeviceOrientationEvent' in window;
}
