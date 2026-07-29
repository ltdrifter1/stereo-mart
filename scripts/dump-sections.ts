/**
 * Dump hotspot/aim data as JSON for scripts/verify-aim.py.
 * Run: npx tsx scripts/dump-sections.ts
 */
import { SPHERE_RADIUS, TEXTURE_SRC } from '../lib/pano';
import { SECTIONS } from '../app/data/sections';

console.log(
  JSON.stringify(
    {
      sphereRadius: SPHERE_RADIUS,
      texture: TEXTURE_SRC,
      sections: SECTIONS.map((s) => ({
        id: s.id,
        u: s.u,
        v: s.v,
        lookU: s.lookU ?? s.u,
        lookV: s.lookV ?? s.v,
        w: s.w,
        h: s.h,
        lookFov: s.lookFov,
        goldEdge: s.goldEdge === true,
      })),
    },
    null,
    2,
  ),
);
