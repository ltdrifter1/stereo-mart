'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { playSfx } from '@/lib/audio';
import { emitFind } from '@/lib/discoveries';
import { LIFE_HITS, type LifeHit } from '@/app/data/hotspots';
import { useSceneEnv, type Controls } from './sceneContext';

const origin = new THREE.Vector3(0, 0, 0);

export const WONDER_EVENT = 'stereo-mart-wonder';

function LifeSprite({
  hit,
  pulse,
}: {
  hit: LifeHit;
  pulse: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const env = useSceneEnv();
  const map = useTexture(hit.src!);
  const [x, y, z] = uvToSpherical(hit.u, hit.v, SPHERE_RADIUS - 0.55);

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    mesh.current?.lookAt(origin);
  }, [map, x, y, z]);

  useFrame(() => {
    const m = mesh.current;
    const material = mat.current;
    if (!m || !material) return;
    m.lookAt(origin);
    if (hit.kind === 'steam' && !env.reduceMotion) {
      const t = env.time;
      material.opacity = 0.45 + Math.sin(t * 1.1) * 0.18;
      m.position.y = y + Math.sin(t * 0.9) * 0.18;
    }
  });

  useEffect(() => {
    if (hit.kind !== 'find' || !pulse) return;
    const m = mesh.current;
    if (!m) return;
    const baseZ = m.rotation.z;
    const tl = gsap.timeline();
    tl.to(m.rotation, { z: baseZ + 0.08, duration: 0.1, ease: 'power1.inOut' })
      .to(m.rotation, { z: baseZ - 0.06, duration: 0.12, ease: 'power1.inOut' })
      .to(m.rotation, { z: baseZ, duration: 0.14, ease: 'power1.out' })
      .fromTo(
        m.scale,
        { x: 1, y: 1, z: 1 },
        { x: 1.12, y: 1.12, z: 1.12, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.inOut' },
        0,
      );
    return () => {
      tl.kill();
    };
  }, [pulse, hit.kind]);

  const visible = hit.kind !== 'find' || Boolean(hit.src);

  if (!visible) return null;

  return (
    <mesh ref={mesh} position={[x, y, z]} renderOrder={2} raycast={() => null}>
      <planeGeometry args={[hit.w, hit.h]} />
      <meshBasicMaterial
        ref={mat}
        map={map}
        transparent
        opacity={hit.kind === 'steam' ? 0.55 : hit.id === 'ghost' ? 0 : 1}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function GhostHaunt({
  hit,
  controls,
  debug,
}: {
  hit: LifeHit;
  controls: Controls;
  debug?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const env = useSceneEnv();
  const [enabled, setEnabled] = useState(false);
  const map = useTexture(hit.src!);
  const [x, y, z] = uvToSpherical(hit.u, hit.v, SPHERE_RADIUS - 0.55);

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    mesh.current?.lookAt(origin);
  }, [map, x, y, z]);

  useEffect(() => {
    if (env.reduceMotion) return;
    let cancelled = false;
    const loop = () => {
      const wait = 8000 + Math.random() * 18000;
      window.setTimeout(() => {
        if (cancelled) return;
        setEnabled(true);
        if (mat.current) {
          gsap.to(mat.current, { opacity: 0.85, duration: 0.35 });
        }
        window.setTimeout(() => {
          if (cancelled) return;
          if (mat.current) gsap.to(mat.current, { opacity: 0, duration: 0.4 });
          setEnabled(false);
          loop();
        }, 1600);
      }, wait);
    };
    const id = window.setTimeout(loop, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [env.reduceMotion]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!env.live.value || controls.dragged || !enabled) return;
    playSfx(hit.sfx);
    if (hit.label) emitFind(hit.id, hit.label);
  };

  return (
    <group>
      <mesh
        ref={mesh}
        position={[x, y, z]}
        renderOrder={2}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!env.live.value || !enabled) return;
          document.documentElement.classList.add('cursor-hot');
        }}
        onPointerOut={() => document.documentElement.classList.remove('cursor-hot')}
      >
        <planeGeometry args={[hit.w, hit.h]} />
        <meshBasicMaterial
          ref={mat}
          map={map}
          transparent
          opacity={debug ? 0.3 : 0}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function LifeMesh({
  hit,
  controls,
  debug,
}: {
  hit: LifeHit;
  controls: Controls;
  debug?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const env = useSceneEnv();
  const [pulse, setPulse] = useState(0);
  const [x, y, z] = uvToSpherical(hit.u, hit.v, SPHERE_RADIUS - 0.55);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!env.live.value || controls.dragged) return;
    playSfx(hit.sfx);
    setPulse((p) => p + 1);
    if (hit.kind === 'find' && hit.label) emitFind(hit.id, hit.label);
  };

  return (
    <group>
      <mesh
        ref={mesh}
        position={[x, y, z]}
        renderOrder={1}
        onClick={hit.kind === 'steam' ? undefined : onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!env.live.value || hit.kind === 'steam') return;
          document.documentElement.classList.add('cursor-hot');
        }}
        onPointerOut={() => document.documentElement.classList.remove('cursor-hot')}
        userData={{ ambientId: hit.id }}
      >
        <planeGeometry args={[hit.w, hit.h]} />
        <meshBasicMaterial
          transparent
          opacity={debug ? 0.22 : 0}
          color={debug ? '#e0b64f' : '#ffffff'}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hit.src && hit.id !== 'ghost' && <LifeSprite hit={hit} pulse={pulse} />}
    </group>
  );
}

export default function AmbientHits({
  controls,
  debug = false,
}: {
  controls: Controls;
  debug?: boolean;
}) {
  return (
    <group>
      {LIFE_HITS.map((hit) =>
        hit.id === 'ghost' ? (
          <GhostHaunt key={hit.id} hit={hit} controls={controls} debug={debug} />
        ) : (
          <LifeMesh key={hit.id} hit={hit} controls={controls} debug={debug} />
        ),
      )}
    </group>
  );
}
