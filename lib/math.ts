/** Shared numeric helpers — keep wrap / degree math in one place. */

export const TWO_PI = Math.PI * 2;
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Wrap radians into (−π, π]. */
export function wrapYaw(y: number): number {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
}

export function isDocumentHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}
