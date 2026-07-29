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
      {/* Hanging tungsten lamps over the aisle (v13 pendant cluster) */}
      <AdditiveQuad u={0.5} v={0.22} w={2.4} h={2.4} tex={glow} color="#ffc070" base={0.3} flickerSpeed={1.2} flickerAmount={0.12} />
      <AdditiveQuad u={0.62} v={0.24} w={2.2} h={2.2} tex={glow} color="#ffd28a" base={0.28} flickerSpeed={0.9} flickerAmount={0.1} />
      <AdditiveQuad u={0.38} v={0.24} w={2.4} h={2.4} tex={glow} color="#ffc070" base={0.3} flickerSpeed={1.4} flickerAmount={0.12} spike />
      {/* Soft aura on the blank yellow square above headphones */}
      <AdditiveQuad u={0.53} v={0.28} w={2.8} h={2.8} tex={glow} color="#fff2c0" base={0.16} flickerSpeed={1.6} flickerAmount={0.12} spike />
    </group>
  );
}
