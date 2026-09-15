import * as THREE from 'three';

let shared: THREE.CanvasTexture | null = null;

/** Hand-drawn looking vinyl disc for the listening-station overlay. */
export function getVinylDiscTexture(): THREE.CanvasTexture {
  if (shared) return shared;
  if (typeof document === 'undefined') {
    shared = new THREE.CanvasTexture(new Image());
    return shared;
  }
  const s = 512;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const cx = s / 2;
  const cy = s / 2;

  ctx.clearRect(0, 0, s, s);

  ctx.beginPath();
  ctx.arc(cx, cy, 246, 0, Math.PI * 2);
  ctx.fillStyle = '#232840';
  ctx.fill();

  for (let r = 238; r > 78; r -= 5) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 10 === 0 ? 'rgba(236,228,210,0.18)' : 'rgba(15,16,28,0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 78, 0, Math.PI * 2);
  ctx.fillStyle = '#e0b64f';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#232840';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.fillStyle = '#ece4d2';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#232840';
  ctx.fill();

  ctx.strokeStyle = 'rgba(236,228,210,0.35)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx - 40, cy - 50, 160, 0.15, 1.1);
  ctx.stroke();

  shared = new THREE.CanvasTexture(c);
  shared.colorSpace = THREE.SRGBColorSpace;
  shared.anisotropy = 8;
  shared.needsUpdate = true;
  return shared;
}
