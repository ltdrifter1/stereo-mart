'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { SPHERE_RADIUS } from '@/lib/pano';
import { isDocumentHidden } from '@/lib/math';
import {
  SILHOUETTE_MAP_SRC,
  silhouetteAmount,
  silhouetteKeyboard,
} from '@/lib/silhouetteGlow';
import { GLOW } from '@/lib/glow';

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMask;
  uniform float uAmt[10];
  uniform vec3 uCream;
  uniform vec3 uYellow;
  varying vec2 vUv;

  float amountFor(int id) {
    if (id == 1) return uAmt[1];
    if (id == 2) return uAmt[2];
    if (id == 3) return uAmt[3];
    if (id == 4) return uAmt[4];
    if (id == 5) return uAmt[5];
    if (id == 6) return uAmt[6];
    if (id == 7) return uAmt[7];
    if (id == 8) return uAmt[8];
    if (id == 9) return uAmt[9];
    return 0.0;
  }

  void main() {
    vec2 uv = vec2(1.0 - vUv.x, vUv.y);
    vec4 m = texture2D(uMask, uv);
    int id = int(m.r * 255.0 + 0.5);
    if (id <= 0 || id > 9) discard;
    float amt = amountFor(id);
    if (amt < 0.012) discard;
    float edge = m.g;
    float fill = m.b;
    vec3 col = mix(uCream, uYellow, clamp(edge * 1.15, 0.0, 1.0));
    float a = amt * (fill * 0.22 + edge * 0.78);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

function hexToRgb(hex: string): THREE.Vector3 {
  const n = parseInt(hex.replace('#', ''), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/**
 * Sphere-space object glows. Same UV as the pano so silhouettes stay locked
 * while panning, zooming, and on mobile — no flat billboard registration.
 */
export default function SilhouetteGlow() {
  const map = useTexture(SILHOUETTE_MAP_SRC);
  const mat = useRef<THREE.ShaderMaterial>(null);

  useLayoutEffect(() => {
    // Packed object IDs in R — must stay linear or ids smear.
    map.colorSpace = THREE.NoColorSpace;
    map.flipY = true;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    map.minFilter = THREE.NearestFilter;
    map.magFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    map.anisotropy = 1;
    map.needsUpdate = true;
  }, [map]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMask: { value: map },
          uAmt: { value: Array.from(silhouetteAmount.current) },
          uCream: { value: hexToRgb(GLOW.edgeTint) },
          uYellow: { value: hexToRgb(GLOW.bloomTint) },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [map],
  );

  useFrame(() => {
    if (isDocumentHidden()) return;
    const u = material.uniforms.uAmt.value as number[];
    for (let i = 0; i < 10; i++) {
      u[i] = Math.max(silhouetteAmount.current[i], silhouetteKeyboard.current[i]);
    }
    if (mat.current) mat.current.uniforms = material.uniforms;
  });

  return (
    <mesh raycast={() => null} renderOrder={2} frustumCulled={false}>
      <sphereGeometry args={[SPHERE_RADIUS - 0.12, 96, 64]} />
      <primitive object={material} ref={mat} attach="material" />
    </mesh>
  );
}
