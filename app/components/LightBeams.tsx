'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeBeamTexture } from '@/lib/sprites';
import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { useSceneEnv } from './sceneContext';

const origin = new THREE.Vector3(0, 0, 0);

/**
 * Reusable additive glow quad welded to an equirectangular (u,v) on the sphere.
 */
export function AdditiveQuad({
  u,
  v,
  w,
  h,
  color = '#ffb347',
  base = 0.4,
  flickerSpeed = 1.2,
  flickerAmount = 0.18,
  spike = false,
  tex,
  inset = 0.45,
}: {
  u: number;
  v: number;
  w: number;
  h: number;
  color?: string;
  base?: number;
  flickerSpeed?: number;
  flickerAmount?: number;
  spike?: boolean;
  tex?: THREE.Texture;
  inset?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const env = useSceneEnv();
  const [x, y, z] = uvToSpherical(u, v, SPHERE_RADIUS - inset);
  const phase = useMemo(() => Math.random() * 10, []);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const t = env.time + phase;
    let f = 1 - flickerAmount + flickerAmount * Math.sin(t * flickerSpeed);
    if (spike) {
      const s = Math.sin(t * 11.0) * Math.sin(t * 6.3 + 1.7);
      if (s > 0.82) f *= 0.35;
      else if (s > 0.7) f *= 0.7;
    }
    m.opacity = env.reduceMotion ? base : base * f;
  });

  return (
    <mesh ref={mesh} position={[x, y, z]} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        map={tex}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={base}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Tungsten shafts falling from the ceiling bulbs and lamps — soft / low opacity. */
export default function LightBeams() {
  const beam = useMemo(() => makeBeamTexture(), []);
  return (
    <group>
      {/* v13 pendant lamps over the aisle (file ≈ y 200–280) */}
      <AdditiveQuad u={0.5} v={0.24} w={5.5} h={14} tex={beam} base={0.06} flickerSpeed={0.7} flickerAmount={0.04} color="#ffc070" />
      <AdditiveQuad u={0.62} v={0.26} w={6} h={15} tex={beam} base={0.055} flickerSpeed={0.5} flickerAmount={0.03} color="#ffb860" />
      <AdditiveQuad u={0.38} v={0.26} w={5} h={12} tex={beam} base={0.06} flickerSpeed={0.9} flickerAmount={0.04} color="#ffcf8a" />
      {/* Soft spill from the sunny storefront */}
      <AdditiveQuad u={0.78} v={0.4} w={5.5} h={13} tex={beam} base={0.05} flickerSpeed={0.6} flickerAmount={0.03} color="#ffe0a0" />
    </group>
  );
}
