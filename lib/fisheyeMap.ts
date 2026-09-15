/**
 * Shared explore/intro fisheye amount + pointer warp matching FisheyePass.
 * Screen NDC (x,y) shows the FBO sample at the warped coordinate — raycasts
 * must use that sample so clicks land on the painted object.
 */
export const fisheyeView = { amount: 0.3 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export function warpPointerNdc(
  x: number,
  y: number,
  amount: number,
  aspect: number,
): { x: number; y: number } {
  const k = clamp01(amount);
  if (k < 0.008) return { x, y };
  let px = x * aspect;
  let py = y;
  const intro = smoothstep((k - 0.28) / 0.72);
  const barrel = 0.11 + (0.34 - 0.11) * intro;
  const r2 = px * px + py * py;
  const radial = 1 + k * barrel * r2;
  const fit = 1 / (1 + k * barrel);
  px *= radial * fit;
  py *= radial * fit;
  return { x: px / aspect, y: py };
}
