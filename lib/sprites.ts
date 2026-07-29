import * as THREE from 'three';

/** A soft radial dot — used for dust motes and glow points. */
export function makeDotTexture(color = '#ffd9a0'): THREE.Texture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.4, 'rgba(255,210,150,0.45)');
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A vertical light-shaft gradient, brightest at the top. */
export function makeBeamTexture(): THREE.Texture {
  const w = 32;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,196,120,0.5)');
  g.addColorStop(0.5, 'rgba(255,170,90,0.16)');
  g.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // soften the horizontal edges
  const hg = ctx.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0, 'rgba(0,0,0,1)');
  hg.addColorStop(0.5, 'rgba(0,0,0,0)');
  hg.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
