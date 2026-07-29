'use client';

import { BANDCAMP_URL, BRAND_NAME, INSTAGRAM_URL } from '@/lib/brand';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { playSfx } from '@/lib/audio';
import { useSceneEnv, type Controls } from './sceneContext';

/** Visible click reaction — alpha-cut billboard of the painted object
 * (baked by scripts/build-v12-pano.py as /hotspots/toy_<id>.webp). */
type ToyPlane = {
  u: number;
  v: number;
  w: number;
  h: number;
};

type AmbientHit = {
  id: string;
  u: number;
  v: number;
  w: number;
  h: number;
  sfx: string;
  /** When set, clicking wiggles the painted object (BT toy micro-reaction). */
  toy?: ToyPlane;
  /**
   * balmingtiger globe class — click opens a random wonder link
   * after a short confirm toast (not a silent eject).
   */
  wonder?: boolean;
};

type WonderLink = { href: string; label: string };

/** Outbound “globe” destinations — Bandcamp / IG / maps rabbit holes. */
const WONDER_LINKS: WonderLink[] = [
  { href: BANDCAMP_URL, label: `${BRAND_NAME} on Bandcamp` },
  { href: INSTAGRAM_URL, label: `${BRAND_NAME} on Instagram` },
  { href: 'https://ltdrifta.bandcamp.com', label: 'LT Drifta on Bandcamp' },
  { href: 'https://inletknight.bandcamp.com', label: 'Inlet Knight on Bandcamp' },
  { href: 'https://drifta.bandcamp.com', label: 'Drifta on Bandcamp' },
  {
    href: 'https://www.google.com/maps/@49.2827,-123.1207,3a,75y,90t/data=!3m1!1e3',
    label: 'Street view — Vancouver',
  },
  {
    href: 'https://www.google.com/maps/@45.5231,-122.6765,3a,75y,120t/data=!3m1!1e3',
    label: 'Street view — Portland',
  },
];

export const WONDER_EVENT = 'stereo-mart-wonder';

/**
 * Non-nav diegetic toys — balmingtiger cushion / owl / fire / globe class.
 * Invisible click meshes + visible sprite wiggles; wonder opens outbound
 * after a confirm toast.
 */
const HITS: AmbientHit[] = [
  // Headphones on the back-wall LISTEN station
  {
    id: 'stool',
    u: 0.499,
    v: 0.352,
    w: 2.4,
    h: 2.2,
    sfx: 'stool',
    toy: { u: 0.499, v: 0.352, w: 10, h: 12 },
  },
  // Plant + cabinet cluster on the CRT / window side
  {
    id: 'crate',
    u: 0.83,
    v: 0.56,
    w: 3.5,
    h: 3.2,
    sfx: 'crate',
    toy: { u: 0.83, v: 0.56, w: 14, h: 14 },
  },
  // Blank yellow square above the headphones
  {
    id: 'poster',
    u: 0.499,
    v: 0.275,
    w: 2.8,
    h: 2.8,
    sfx: 'poster',
    toy: { u: 0.499, v: 0.275, w: 10, h: 10 },
  },
  // Milk-crate cluster on the front of the moss rug
  {
    id: 'cushion',
    u: 0.492,
    v: 0.742,
    w: 3.5,
    h: 2.2,
    sfx: 'cushion',
    toy: { u: 0.492, v: 0.742, w: 22, h: 10 },
  },
  // Tall plant by the LISTEN wall
  {
    id: 'owl',
    u: 0.564,
    v: 0.371,
    w: 2.6,
    h: 2.8,
    sfx: 'owl',
    toy: { u: 0.564, v: 0.371, w: 14, h: 20 },
  },
  // Moss rug pool under the island
  {
    id: 'fire',
    u: 0.495,
    v: 0.7,
    w: 3.2,
    h: 2.6,
    sfx: 'fire',
    toy: { u: 0.495, v: 0.7, w: 20, h: 12 },
  },
  // Storefront window looking onto the sunny street
  {
    id: 'wonder',
    u: 0.772,
    v: 0.45,
    w: 3.2,
    h: 3.2,
    sfx: 'wonder',
    wonder: true,
    toy: { u: 0.772, v: 0.45, w: 16, h: 20 },
  },
];

const origin = new THREE.Vector3(0, 0, 0);

function ToySprite({
  id,
  toy,
  pulse,
}: {
  id: string;
  toy: ToyPlane;
  pulse: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const env = useSceneEnv();
  const map = useTexture(`/hotspots/toy_${id}.webp`);
  const [x, y, z] = uvToSpherical(toy.u, toy.v, SPHERE_RADIUS - 0.6);

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    mesh.current?.lookAt(origin);
  }, [map, x, y, z]);

  useEffect(() => {
    const m = mesh.current;
    const material = mat.current;
    if (!pulse || !m || !material) return;
    if (env.reduceMotion) {
      material.opacity = 0.85;
      const id = window.setTimeout(() => {
        material.opacity = 0;
      }, 220);
      return () => window.clearTimeout(id);
    }

    gsap.killTweensOf([m.rotation, m.scale, material]);
    const baseZ = m.rotation.z;
    const tl = gsap.timeline({
      onComplete: () => {
        m.rotation.z = baseZ;
        m.scale.setScalar(1);
      },
    });
    tl.set(material, { opacity: 1 })
      .to(m.rotation, { z: baseZ + 0.06, duration: 0.07, ease: 'power1.inOut' })
      .to(m.rotation, { z: baseZ - 0.05, duration: 0.11, ease: 'power1.inOut' })
      .to(m.rotation, { z: baseZ + 0.025, duration: 0.1, ease: 'power1.inOut' })
      .to(m.rotation, { z: baseZ, duration: 0.1, ease: 'power1.inOut' })
      .to(material, { opacity: 0, duration: 0.16 }, '>-0.04')
      .fromTo(
        m.scale,
        { x: 1, y: 1, z: 1 },
        { x: 1.06, y: 1.06, z: 1.06, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' },
        0,
      );
    return () => {
      tl.kill();
    };
  }, [pulse, env.reduceMotion]);

  return (
    <mesh ref={mesh} position={[x, y, z]} renderOrder={2} raycast={() => null}>
      <planeGeometry args={[toy.w, toy.h]} />
      <meshBasicMaterial
        ref={mat}
        map={map}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function AmbientMesh({
  hit,
  controls,
  debug,
}: {
  hit: AmbientHit;
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
    if (hit.toy) setPulse((p) => p + 1);
    if (hit.wonder) {
      const pick = WONDER_LINKS[Math.floor(Math.random() * WONDER_LINKS.length)];
      window.dispatchEvent(
        new CustomEvent(WONDER_EVENT, {
          detail: pick,
        }),
      );
    }
  };

  return (
    <group>
      <mesh
        ref={mesh}
        position={[x, y, z]}
        renderOrder={1}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!env.live.value) return;
          document.documentElement.classList.add('cursor-hot');
        }}
        onPointerOut={() => {
          document.documentElement.classList.remove('cursor-hot');
        }}
        userData={{ ambientId: hit.id }}
      >
        <planeGeometry args={[hit.w, hit.h]} />
        <meshBasicMaterial
          transparent
          opacity={debug ? 0.22 : 0}
          color={debug ? (hit.wonder ? '#ffe66d' : '#7dffb3') : '#ffffff'}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hit.toy && <ToySprite id={hit.id} toy={hit.toy} pulse={pulse} />}
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
      {HITS.map((hit) => (
        <AmbientMesh key={hit.id} hit={hit} controls={controls} debug={debug} />
      ))}
    </group>
  );
}
