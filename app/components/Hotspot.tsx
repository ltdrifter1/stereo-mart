'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { uvToSpherical, SPHERE_RADIUS } from '@/lib/pano';
import { GLOW } from '@/lib/glow';
import { setSilhouetteAmount, type SilhouetteName } from '@/lib/silhouetteGlow';
import type { RoomHotspot } from '@/app/data/hotspots';
import { useSceneEnv, type Controls } from './sceneContext';
import { isTap, tapOrigin, type TapOrigin } from '@/lib/pointerTap';

export { GLOW } from '@/lib/glow';

const origin = new THREE.Vector3(0, 0, 0);

function OverlayProp({
  src,
  w,
  h,
}: {
  src: string;
  w: number;
  h: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const map = useTexture(src);
  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map]);
  useFrame(() => {
    mesh.current?.lookAt(origin);
  });
  return (
    <mesh ref={mesh} renderOrder={4} raycast={() => null} position={[0, 0, 0.08]}>
      <planeGeometry args={[w, h]} />
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

/**
 * Hotspot — balmingtiger pattern:
 *   generous invisible hit plane + object-shaped silhouette (sphere ID map)
 *   hoverIn  → glow alpha 0→hover, duration 0.4, ease power1.inOut
 *   hoverOut → glow alpha →0 — EXCEPT latched sections while focused
 */
export default function Hotspot({
  spot,
  onOpen,
  controls: _controls,
  focusedId = null,
  debug = false,
}: {
  spot: RoomHotspot;
  onOpen: (id: string) => void;
  controls: Controls;
  focusedId?: string | null;
  debug?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef({ a: 0 });
  const breath = useRef(0);
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const [x, y, z] = uvToSpherical(spot.u, spot.v, SPHERE_RADIUS - 0.5);
  const press = useRef<TapOrigin | null>(null);
  const maskName = spot.id as SilhouetteName;

  const canLatch = spot.glowLatches !== false;
  const isFocused = canLatch && focusedId === spot.id;

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);

  useLayoutEffect(() => {
    const on = isFocused || hovered;
    gsap.to(glow.current, {
      a: on ? (isFocused ? GLOW.focusedAlpha : GLOW.hoverAlpha) : 0,
      duration: env.reduceMotion ? 0 : GLOW.hoverFade,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [isFocused, hovered, env.reduceMotion]);

  useFrame((_state, delta) => {
    const m = mesh.current;
    if (!m) return;

    m.lookAt(origin);

    const now = performance.now();
    const settleActive =
      env.inviteUntil.value > 0 && now < env.inviteUntil.value;
    const settleFade = settleActive
      ? Math.min(1, (env.inviteUntil.value - now) / 900)
      : 0;

    const listeningHere =
      env.listening.value &&
      (spot.opens === 'listening-booth' || spot.opens === 'cash-register') &&
      (isFocused || env.focusedId.value === spot.id);

    const hot = isFocused || hovered || listeningHere;
    if (env.live.value && !env.reduceMotion && hot) {
      breath.current +=
        delta * (listeningHere ? GLOW.listeningBreathSpeed : GLOW.breathSpeed);
    } else if (!env.live.value) {
      breath.current = 0;
    }
    const wave = env.reduceMotion ? 0.55 : Math.sin(breath.current) * 0.5 + 0.5;

    let idleA = 0;
    if (env.live.value && !isFocused && !hovered && settleActive && !env.panelOpen.value) {
      idleA = GLOW.settleBoost * settleFade;
    }

    if (listeningHere) {
      glow.current.a = Math.max(glow.current.a, GLOW.focusedAlpha);
    }

    const a = Math.max(glow.current.a, idleA);
    const pulse = hot ? 0.88 + 0.12 * wave : 1;
    setSilhouetteAmount(maskName, a * pulse);
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
    onOpen(spot.id);
  };

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={mesh}
        renderOrder={3}
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
        userData={{ hotspotId: spot.id, nav: spot.object }}
      >
        <planeGeometry args={[spot.w, spot.h]} />
        <meshBasicMaterial
          transparent
          opacity={debug ? 0.3 : 0}
          color={debug ? '#e0b64f' : '#ffffff'}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {spot.overlaySrc && (
        <OverlayProp
          src={spot.overlaySrc}
          w={spot.overlayW ?? spot.w}
          h={spot.overlayH ?? spot.h}
        />
      )}

      {hovered && !isFocused && !spot.hideHint && (
        <Html center zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
          <span className="hotspot-pill">{spot.object}</span>
        </Html>
      )}
    </group>
  );
}
