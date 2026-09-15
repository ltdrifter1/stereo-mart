import * as THREE from 'three';

/**
 * Soft painted aura — BT hover language without geometric rings.
 * Irregular overlapping blobs so it reads as lamp-light on the object,
 * not a HUD marker. Shared across hotspots.
 */
let shared: THREE.CanvasTexture | null = null;

export function getSoftAuraTexture(): THREE.CanvasTexture {
  if (shared) return shared;
  if (typeof document === 'undefined') {
    shared = new THREE.CanvasTexture(new Image());
    return shared;
  }
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const blobs: [number, number, number, number][] = [
    [128, 128, 118, 1],
    [112, 120, 86, 0.65],
    [146, 116, 78, 0.55],
    [122, 148, 72, 0.45],
    [138, 142, 64, 0.4],
  ];
  for (const [cx, cy, r, a] of blobs) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.06, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${0.72 * a})`);
    g.addColorStop(0.28, `rgba(255,255,255,${0.32 * a})`);
    g.addColorStop(0.62, `rgba(255,255,255,${0.1 * a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }

  shared = new THREE.CanvasTexture(c);
  shared.colorSpace = THREE.SRGBColorSpace;
  shared.needsUpdate = true;
  return shared;
}
