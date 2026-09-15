'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { getSoftAuraTexture } from '@/lib/aura';
import { LAMP_UV } from '@/app/data/hotspots';
import { useSceneEnv, type Controls } from './sceneContext';
import { isTap, tapOrigin, type TapOrigin } from '@/lib/pointerTap';

const origin = new THREE.Vector3(0, 0, 0);

/** Desk lamp on the v20 plate — toggles lights_on / lights_off. */
export const LAMP_U = LAMP_UV.u;
export const LAMP_V = LAMP_UV.v;

export default function LampHotspot({
  controls: _controls,
  lightsOn,
  onToggle,
}: {
  controls: Controls;
  lightsOn: boolean;
  onToggle: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const glowMesh = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef({ a: lightsOn ? 0.22 : 0 });
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const press = useRef<TapOrigin | null>(null);
  const [x, y, z] = useMemo(
    () => uvToSpherical(LAMP_U, LAMP_V, SPHERE_RADIUS - 1.6),
    [],
  );
  const tex = useMemo(() => getSoftAuraTexture(), []);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    glowMesh.current?.lookAt(origin);
  }, [x, y, z]);

  useLayoutEffect(() => {
    gsap.to(glow.current, {
      a: lightsOn ? (hovered ? 0.48 : 0.2) : hovered ? 0.34 : 0,
      duration: env.reduceMotion ? 0 : 0.4,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [lightsOn, hovered, env.reduceMotion]);

  useFrame(() => {
    if (glowMat.current) glowMat.current.opacity = glow.current.a;
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
      <mesh ref={glowMesh} renderOrder={6} raycast={() => null}>
        <planeGeometry args={[6.2, 6.2]} />
        <meshBasicMaterial
          ref={glowMat}
          map={tex}
          color="#e0b64f"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={mesh}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!env.live.value) return;
          setHovered(true);
          document.documentElement.classList.add('cursor-hot');
        }}
        onPointerOut={() => {
          setHovered(false);
          document.documentElement.classList.remove('cursor-hot');
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
