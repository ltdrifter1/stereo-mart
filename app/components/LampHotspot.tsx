'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { useSceneEnv, type Controls } from './sceneContext';

const origin = new THREE.Vector3(0, 0, 0);

/** Ceiling fan / lamp cluster in the v13 store — toggles lights on/off. */
export const LAMP_U = 0.5;
export const LAMP_V = 0.2;

function makeLampGlow() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  // Soft warm aura around the bulb — no filled slab, no label text.
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 230, 160, 0.95)');
  g.addColorStop(0.2, 'rgba(255, 190, 80, 0.55)');
  g.addColorStop(0.5, 'rgba(255, 150, 50, 0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function LampHotspot({
  controls,
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
  const glow = useRef({ a: lightsOn ? 0.55 : 0.15 });
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const [x, y, z] = useMemo(
    () => uvToSpherical(LAMP_U, LAMP_V, SPHERE_RADIUS - 0.55),
    [],
  );
  const tex = useMemo(() => makeLampGlow(), []);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    glowMesh.current?.lookAt(origin);
    return () => tex.dispose();
  }, [x, y, z, tex]);

  useLayoutEffect(() => {
    gsap.to(glow.current, {
      a: lightsOn ? (hovered ? 1 : 0.55) : hovered ? 0.7 : 0.12,
      duration: env.reduceMotion ? 0 : 0.4,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [lightsOn, hovered, env.reduceMotion]);

  useFrame(() => {
    if (glowMat.current) glowMat.current.opacity = glow.current.a;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // BT hotspots stay clickable during lookto (capture=false); only suppress drag slips.
    if (controls.dragged || !env.live.value) return;
    onToggle();
  };

  return (
    <group position={[x, y, z]}>
      <mesh ref={glowMesh} renderOrder={1} raycast={() => null}>
        <planeGeometry args={[5.5, 7]} />
        <meshBasicMaterial
          ref={glowMat}
          map={tex}
          color="#ffd27a"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.5}
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
        onClick={handleClick}
        userData={{ hotspotId: 'lamp', nav: 'Lights' }}
      >
        <planeGeometry args={[3.2, 4.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
