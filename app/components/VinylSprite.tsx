'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { getVinylDiscTexture } from '@/lib/vinylDisc';
import { HOTSPOT_BY_ID } from '@/app/data/hotspots';
import { useSceneEnv } from './sceneContext';

const origin = new THREE.Vector3(0, 0, 0);
const booth = HOTSPOT_BY_ID['listening-booth'];

/**
 * Spinning record over the listening station — record-shop version of BT’s
 * always-looping music objects. Idles slowly; races while a preview plays.
 */
export default function VinylSprite() {
  const mesh = useRef<THREE.Mesh>(null);
  const env = useSceneEnv();
  const map = useMemo(() => getVinylDiscTexture(), []);
  const [x, y, z] = uvToSpherical(booth.u, booth.v + 0.045, SPHERE_RADIUS - 1.15);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    m.lookAt(origin);
    if (env.reduceMotion) return;
    const speed = env.listening.value ? 2.8 : 0.55;
    m.rotation.z -= delta * speed;
  });

  return (
    <mesh ref={mesh} position={[x, y, z]} renderOrder={5} raycast={() => null}>
      <circleGeometry args={[1.2, 48]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
