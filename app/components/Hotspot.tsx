'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { uvToSpherical, SPHERE_RADIUS } from '@/lib/pano';
import { GLOW } from '@/lib/glow';
import type { Section } from '@/app/data/sections';
import { useSceneEnv, type Controls } from './sceneContext';

export { GLOW } from '@/lib/glow';

const origin = new THREE.Vector3(0, 0, 0);

/**
 * Prep glow/edge maps for additive rim rendering.
 * Authored thin *_edge.webp masks are kept as silhouette rims.
 * Filled slabs (the “orange block” failure mode) are morphologically
 * thinned to outer edges so they can’t paint a solid rectangle.
 */
function prepGlowMap(map: THREE.Texture, flipX?: boolean) {
  try {
    map.colorSpace = THREE.SRGBColorSpace;
    const img = map.image as
      | HTMLImageElement
      | HTMLCanvasElement
      | ImageBitmap
      | undefined;
    if (img && 'width' in img && img.width) {
      const w = img.width;
      const h = img.height;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img as CanvasImageSource, 0, 0);
        const src = ctx.getImageData(0, 0, w, h);
        const d = src.data;

        let hasTrans = false;
        for (let i = 3; i < d.length; i += 4) {
          if (d[i] < 250) {
            hasTrans = true;
            break;
          }
        }

        const a = new Float32Array(w * h);
        for (let i = 0, p = 0; i < d.length; i += 4, p++) {
          const lum = Math.max(d[i], d[i + 1], d[i + 2]) / 255;
          a[p] = hasTrans ? d[i + 3] / 255 : lum;
        }

        let solid = 0;
        for (let i = 0; i < a.length; i++) if (a[i] > 0.55) solid++;
        const filled = solid / a.length > 0.18;

        const out = ctx.createImageData(w, h);
        const o = out.data;

        if (!filled) {
          // Authored edge map — keep silhouette alpha, force white RGB for tint control.
          for (let p = 0, i = 0; p < a.length; p++, i += 4) {
            o[i] = 255;
            o[i + 1] = 255;
            o[i + 2] = 255;
            o[i + 3] = Math.round(Math.min(1, a[p] * 1.15) * 255);
          }
        } else {
          // Filled slab → outer rim only (mask − eroded).
          const eroded = new Float32Array(a.length);
          const r = GLOW.erodePx;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              let m = 1;
              for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                  if (dx * dx + dy * dy > r * r) continue;
                  const xx = Math.min(w - 1, Math.max(0, x + dx));
                  const yy = Math.min(h - 1, Math.max(0, y + dy));
                  m = Math.min(m, a[yy * w + xx]);
                }
              }
              eroded[y * w + x] = m;
            }
          }
          for (let p = 0, i = 0; p < a.length; p++, i += 4) {
            const rim = Math.max(0, a[p] - eroded[p]);
            const v = Math.min(1, rim * 2.6);
            o[i] = 255;
            o[i + 1] = 255;
            o[i + 2] = 255;
            o[i + 3] = Math.round(v * 255);
          }
        }

        ctx.putImageData(out, 0, 0);
        map.image = c;
        map.format = THREE.RGBAFormat;
      }
    }
    if (flipX) {
      map.wrapS = THREE.RepeatWrapping;
      map.repeat.x = -1;
      map.offset.x = 1;
    } else {
      map.wrapS = THREE.ClampToEdgeWrapping;
      map.repeat.x = 1;
      map.offset.x = 0;
    }
    map.needsUpdate = true;
  } catch {
    /* keep original map if canvas prep fails */
  }
}

/**
 * Hotspot — balmingtiger pattern:
 *   invisible hit plane + warm OUTER-EDGE glow (not a filled block)
 *   hoverIn  → glow alpha 0→1, duration 0.4, ease power1.inOut
 *   hoverOut → glow alpha 1→0 — EXCEPT latched sections while focused
 *
 * No proximity / label text over the glow (nav labels live in TopNav only).
 */
export default function Hotspot({
  section,
  onOpen,
  controls,
  focusedId = null,
  debug = false,
}: {
  section: Section;
  onOpen: (id: string) => void;
  controls: Controls;
  focusedId?: string | null;
  debug?: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const edgeMesh = useRef<THREE.Mesh>(null);
  const bloomMesh = useRef<THREE.Mesh>(null);
  const edgeMat = useRef<THREE.MeshBasicMaterial>(null);
  const bloomMat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef({ a: 0 });
  const breath = useRef(0);
  const [hovered, setHovered] = useState(false);
  const env = useSceneEnv();
  const [x, y, z] = uvToSpherical(section.u, section.v, SPHERE_RADIUS - 0.5);

  const canLatch = section.glowLatches !== false;
  const isFocused = canLatch && focusedId === section.id;

  // Prefer authored *_edge.webp (silhouette rim). Fall back to glow map.
  const edgeSrc = section.goldEdge
    ? `/hotspots/${section.id}_edge.webp`
    : `/hotspots/${section.id}_glow.webp`;
  const edgeMap = useTexture(edgeSrc);

  useLayoutEffect(() => {
    prepGlowMap(edgeMap, section.glowFlipX);
  }, [edgeMap, section.glowFlipX]);

  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
    edgeMesh.current?.lookAt(origin);
    bloomMesh.current?.lookAt(origin);
  }, [x, y, z]);

  useLayoutEffect(() => {
    const on = isFocused || hovered;
    gsap.to(glow.current, {
      a: on ? 1 : 0,
      duration: env.reduceMotion ? 0 : GLOW.hoverFade,
      ease: 'power1.inOut',
      overwrite: true,
    });
  }, [isFocused, hovered, env.reduceMotion]);

  useFrame((_state, delta) => {
    const m = mesh.current;
    if (!m) return;

    m.lookAt(origin);
    edgeMesh.current?.lookAt(origin);
    bloomMesh.current?.lookAt(origin);

    const now = performance.now();
    const settleActive =
      env.inviteUntil.value > 0 && now < env.inviteUntil.value;
    const settleFade = settleActive
      ? Math.min(1, (env.inviteUntil.value - now) / 900)
      : 0;

    // Diegetic “record on” — Music / Shop booth pulses while preview plays.
    const listeningHere =
      env.listening.value &&
      (section.id === 'listening-booth' || section.id === 'cash-register') &&
      (isFocused || env.focusedId.value === section.id);

    // Always-on idle breath while the room is live — hover/focus ride above it.
    const hot = isFocused || hovered || listeningHere;
    if (env.live.value && !env.reduceMotion) {
      const speed = listeningHere
        ? GLOW.listeningBreathSpeed
        : hot
          ? GLOW.breathSpeed
          : settleActive
            ? GLOW.breathSpeed * 0.9
            : GLOW.idleBreathSpeed;
      breath.current += delta * speed;
    } else if (!env.live.value) {
      breath.current = 0;
    }
    const wave = env.reduceMotion ? 0.55 : Math.sin(breath.current) * 0.5 + 0.5;

    let idleA = 0;
    if (env.live.value && !isFocused && !hovered) {
      const panelMul = env.panelOpen.value ? GLOW.idlePanelMul : 1;
      idleA = env.reduceMotion
        ? GLOW.idleBase * panelMul
        : (GLOW.idleBase + wave * GLOW.idleAmp) * panelMul;
      // Stronger post-settle pulse, then the idle floor keeps whispering.
      if (settleActive && !env.panelOpen.value) {
        idleA = Math.max(idleA, GLOW.settleBoost * settleFade);
      }
    }

    // Keep the focused booth fully lit + slightly above hover while listening.
    if (listeningHere) {
      glow.current.a = Math.max(glow.current.a, 1);
    }

    const a = Math.max(glow.current.a, idleA);
    // Edge-only BT language: bright rim + soft outer bloom, no filled slab.
    const edgeAmp = listeningHere ? GLOW.listeningEdgeAmp : GLOW.edgeAmp;
    const bloomAmp = listeningHere ? GLOW.listeningBloomAmp : GLOW.bloomAmp;
    const edgeSwell = listeningHere ? GLOW.listeningSwell : GLOW.edgeSwell;
    const bloomSwell = listeningHere ? GLOW.listeningSwell : GLOW.bloomSwell;
    const edgeMul = GLOW.edgeBase + wave * edgeAmp;
    const bloomMul = GLOW.bloomBase + wave * bloomAmp;
    const scaleMul = 1 + wave * edgeSwell * a;
    const bloomScale = GLOW.bloomScale * (1 + wave * bloomSwell * a);

    if (edgeMesh.current) edgeMesh.current.scale.setScalar(scaleMul);
    if (bloomMesh.current) bloomMesh.current.scale.setScalar(bloomScale);

    if (edgeMat.current) {
      edgeMat.current.opacity = a * edgeMul;
      edgeMat.current.visible = a > 0.02;
    }
    if (bloomMat.current) {
      bloomMat.current.opacity = a * bloomMul;
      bloomMat.current.visible = a > 0.02;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!env.live.value || controls.dragged) return;
    if (!canLatch) {
      gsap.fromTo(
        glow.current,
        { a: Math.max(glow.current.a, 0.35) },
        { a: 1, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut', overwrite: true },
      );
    }
    onOpen(section.id);
  };

  const gw = section.glowW ?? section.w;
  const gh = section.glowH ?? section.h;

  return (
    <group position={[x, y, z]}>
      {/* Soft outer bloom — faint, wide, warm */}
      <mesh ref={bloomMesh} renderOrder={1} raycast={() => null}>
        <planeGeometry args={[gw, gh]} />
        <meshBasicMaterial
          ref={bloomMat}
          map={edgeMap}
          color={GLOW.bloomTint}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Bright silhouette rim — the actual BT edge glow */}
      <mesh ref={edgeMesh} renderOrder={2} raycast={() => null}>
        <planeGeometry args={[gw, gh]} />
        <meshBasicMaterial
          ref={edgeMat}
          map={edgeMap}
          color={GLOW.edgeTint}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          opacity={0}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

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
        onClick={handleClick}
        userData={{ hotspotId: section.id, nav: section.nav }}
      >
        <planeGeometry args={[section.w, section.h]} />
        <meshBasicMaterial
          transparent
          opacity={debug ? 0.3 : 0}
          color={debug ? section.accent : '#ffffff'}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* BT-style hover label — one word, fades with the glow, never blocks */}
      {hovered && !isFocused && (
        <Html center zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
          <span className="hotspot-pill">{section.nav}</span>
        </Html>
      )}
    </group>
  );
}
