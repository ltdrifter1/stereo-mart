'use client';

import { useMemo } from 'react';
import { makeDotTexture } from '@/lib/sprites';
import { AdditiveQuad } from './LightBeams';

/**
 * Signage that breathes and stutters — welded to equirect (u,v) on the sphere
 * so each accent stays registered as you look around the room.
 */
export default function Flicker() {
  const glow = useMemo(() => makeDotTexture('#ffffff'), []);

  return (
    <group>
      {/* Hanging tungsten lamps over the aisle */}
      <AdditiveQuad u={0.688} v={0.176} w={2.4} h={2.4} tex={glow} color="#ffc070" base={0.3} flickerSpeed={1.2} flickerAmount={0.12} />
      <AdditiveQuad u={0.574} v={0.166} w={2.2} h={2.2} tex={glow} color="#ffd28a" base={0.28} flickerSpeed={0.9} flickerAmount={0.1} />
      <AdditiveQuad u={0.395} v={0.166} w={2.4} h={2.4} tex={glow} color="#ffc070" base={0.3} flickerSpeed={1.4} flickerAmount={0.12} spike />
      {/* LISTEN sign above the booth */}
      <AdditiveQuad u={0.756} v={0.3} w={3.4} h={1.4} tex={glow} color="#fff2c0" base={0.2} flickerSpeed={2.2} flickerAmount={0.18} spike />
    </group>
  );
}
