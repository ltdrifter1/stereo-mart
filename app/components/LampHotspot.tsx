'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { setSilhouetteAmount } from '@/lib/silhouetteGlow';
import { MOTION } from '@/lib/motion';
import { LAMP_UV } from '@/app/data/hotspots';
import { useSceneEnv, type Controls } from './sceneContext';
import { isTap, tapOrigin, type TapOrigin } from '@/lib/pointerTap';
import { useCanvasHover } from './useCanvasHover';

const origin = new THREE.Vector3(0, 0, 0);

/** Desk lamp on the v20 plate — toggles lights_on / lights_off. */
export const LAMP_U = LAMP_UV.u;
export const LAMP_V = LAMP_UV.v;

export default function LampHotspot({
  controls: _controls,
  lightsOn: _lightsOn,
  onToggle,
}: {
  controls: Controls;
  lightsOn: boolean;
  onToggle: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef({ a: 0 });
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const press = useRef<TapOrigin | null>(null);
  const hover = useCanvasHover('lamp', 'Lamp');
  const [x, y, z] = useMemo(
    () => uvToSpherical(LAMP_U, LAMP_V, SPHERE_RADIUS - 1.6),
    [],
  );

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  useLayoutEffect(() => {
    gsap.to(glow.current, {
      a: hovered ? 0.4 : 0,
      duration: env.reduceMotion ? 0 : MOTION.hoverAura,
      ease: MOTION.hoverEase,
      overwrite: true,
    });
  }, [hovered, env.reduceMotion]);

  useFrame(() => {
    setSilhouetteAmount('lamp', glow.current.a);
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    press.current = tapOrigin(e);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const start = press.current;
    press.current = null;
    if (!env.live.value || !isTap(e, start)) return;
    onToggle();
  };

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          hover.onOver(() => e.stopPropagation(), env.live.value);
          if (env.live.value) setHovered(true);
        }}
        onPointerOut={() => {
          hover.onOut();
          setHovered(false);
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        renderOrder={7}
        userData={{ hotspotId: 'lamp', nav: 'Lights' }}
      >
        <planeGeometry args={[6.5, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
