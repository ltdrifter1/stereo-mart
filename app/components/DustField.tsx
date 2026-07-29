'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeDotTexture } from '@/lib/sprites';
import { useSceneEnv } from './sceneContext';

/** Dust floats in a shell around the eye so turning the view reveals depth. */
const RADIUS_MIN = 2.5;
const RADIUS_MAX = 14;

export default function DustField({ count = 200 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  const env = useSceneEnv();
  const tex = useMemo(() => makeDotTexture('#ffe1b0'), []);

  const { positions, speeds, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const r = RADIUS_MIN + Math.random() * (RADIUS_MAX - RADIUS_MIN);
      const yaw = (u - 0.5) * Math.PI * 2;
      const pitch = (0.5 - v) * Math.PI * 0.85;
      const cp = Math.cos(pitch);
      positions[i * 3] = Math.sin(yaw) * cp * r;
      positions[i * 3 + 1] = Math.sin(pitch) * r;
      positions[i * 3 + 2] = -Math.cos(yaw) * cp * r;
      speeds[i] = 0.05 + Math.random() * 0.18;
      sizes[i] = 0.04 + Math.random() * 0.12;
    }
    return { positions, speeds, sizes };
  }, [count]);

  useFrame((_, delta) => {
    const p = points.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    const d = env.reduceMotion ? delta * 0.3 : delta;
    const t = env.time;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix + 1] += speeds[i] * d * 0.55;
      arr[ix] += Math.sin(t * 0.4 + i) * 0.0014;
      // recycle above the eye back below
      if (arr[ix + 1] > RADIUS_MAX * 0.7) arr[ix + 1] = -RADIUS_MAX * 0.55;
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={0.12}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.45}
        toneMapped={false}
      />
    </points>
  );
}
