'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

/**
 * krpano-style view.fisheye (balmingtiger explore = 0.3).
 *
 * Explore stays mild so the packed store doesn't feel squeezed.
 * Intro (amount→1) ramps barrel + FOV expand for a readable little-planet
 * swirl on iPhone, where FOV alone used to be nearly a no-op.
 */
export default function FisheyePass({
  amountRef,
  reduceMotion = false,
}: {
  amountRef: { current: number };
  reduceMotion?: boolean;
}) {
  const { gl, scene, camera, size } = useThree();
  const fbo = useFBO({ samples: 0, depthBuffer: true });
  const amountSmooth = useRef(0.3);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null as THREE.Texture | null },
          uAmount: { value: 0.3 },
          uAspect: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse;
          uniform float uAmount;
          uniform float uAspect;
          varying vec2 vUv;

          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            p.x *= uAspect;

            float k = clamp(uAmount, 0.0, 1.0);
            // Bias warp toward intro (k→1) while keeping explore (k≈0.3) gentle.
            float intro = smoothstep(0.28, 1.0, k);
            float r2 = dot(p, p);
            float barrel = mix(0.11, 0.34, intro);
            float radial = 1.0 + k * barrel * r2;
            float fit = 1.0 / (1.0 + k * barrel);
            vec2 q = p * radial * fit;

            q.x = clamp(q.x, -uAspect * 0.995, uAspect * 0.995);
            q.y = clamp(q.y, -0.995, 0.995);
            q.x /= uAspect;
            vec2 uv = q * 0.5 + 0.5;

            vec4 col = texture2D(tDiffuse, uv);
            // Light grade — avoid crushing midtones into a "crowded" look.
            col.rgb = pow(max(col.rgb, 0.0), vec3(0.94));
            col.rgb = mix(col.rgb, smoothstep(0.04, 0.96, col.rgb), 0.1);
            gl_FragColor = col;
          }
        `,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  const quad = useMemo(() => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    return mesh;
  }, [material]);

  const outScene = useMemo(() => {
    const s = new THREE.Scene();
    s.add(quad);
    return s;
  }, [quad]);

  const outCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  useEffect(() => {
    fbo.setSize(size.width, size.height);
    material.uniforms.uAspect.value = size.width / Math.max(1, size.height);
  }, [fbo, material, size.width, size.height]);

  useEffect(
    () => () => {
      material.dispose();
      quad.geometry.dispose();
    },
    [material, quad],
  );

  useFrame(() => {
    // Skip FBO warp under reduced motion — render the scene straight through.
    if (reduceMotion) {
      amountSmooth.current = 0;
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    amountSmooth.current += (amountRef.current - amountSmooth.current) * 0.45;
    const k = Math.max(0, amountSmooth.current);
    const cam = camera as THREE.PerspectiveCamera;
    const baseFov = cam.fov;

    // Explore k=0.3 → ~8% wider; intro k=1 → ~55% for little-planet presence.
    const intro = Math.max(0, Math.min(1, (k - 0.28) / 0.72));
    const expand = 1 + k * (0.28 + intro * 0.32);

    if (k < 0.008) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }

    cam.fov = Math.min(170, baseFov * expand);
    cam.updateProjectionMatrix();

    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, camera);

    cam.fov = baseFov;
    cam.updateProjectionMatrix();

    material.uniforms.tDiffuse.value = fbo.texture;
    material.uniforms.uAmount.value = k;

    gl.setRenderTarget(null);
    gl.render(outScene, outCam);
  }, 1);

  return null;
}
