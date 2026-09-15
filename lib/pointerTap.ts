import type { ThreeEvent } from '@react-three/fiber';

/** Pixel slack before a press is treated as a look-around drag, not a click. */
export const TAP_SLOP_PX = 28;

export type TapOrigin = { x: number; y: number };

export function tapOrigin(e: ThreeEvent<PointerEvent>): TapOrigin {
  return { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
}

export function isTap(
  e: ThreeEvent<PointerEvent>,
  start: TapOrigin | null,
  slop = TAP_SLOP_PX,
): boolean {
  if (!start) return false;
  return Math.hypot(e.nativeEvent.clientX - start.x, e.nativeEvent.clientY - start.y) <= slop;
}
