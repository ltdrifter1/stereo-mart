'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { SECTION_BY_ID } from '@/app/data/sections';
import { setBgmDucked } from '@/lib/audio';

const origin = new THREE.Vector3(0, 0, 0);
const crt = SECTION_BY_ID['crt-tv'];
/** Branded STEREO-MART station ID — not SMPTE color bars. */
export const CRT_DEFAULT_SRC = '/videos/channel_b.mp4';

/**
 * CRT stage — balmingtiger TV stack:
 *   black / off backing → video plane → plastic frame bezel
 * Alpha 0 until Videos is focused + armed (post-lookto).
 * Panel picks swap `src` in-place (stay in the room).
 *
 * Sizing: video fills the painted tube glass; frame sits around the chassis.
 * Hit plane `crt.w/h` is tube-set sized; glass is a smaller inset + XY bias
 * (CRT sits off-center on the cabinet). Keep in lockstep with
 * `crt_overlays()` in scripts/build-v9-pano.py.
 */
/** Glass size as a fraction of sections.ts crt-tv w/h (Y2K silver CRT). */
const SCREEN_W_FAC = 0.7;
const SCREEN_H_FAC = 0.68;
/** Local plane offset from hotspot center → painted glass center. */
const SCREEN_OX = 0.35;
const SCREEN_OY = -0.55;
const FRAME_W_FAC = 0.95;
const FRAME_H_FAC = 0.92;
export default function CrtScreen({
  activeId,
  armed = false,
  src = CRT_DEFAULT_SRC,
  reduceMotion = false,
}: {
  activeId: string | null;
  armed?: boolean;
  src?: string;
  reduceMotion?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const videoMesh = useRef<THREE.Mesh>(null);
  const frameMesh = useRef<THREE.Mesh>(null);
  const backOffMesh = useRef<THREE.Mesh>(null);
  const backOnMesh = useRef<THREE.Mesh>(null);
  const videoMat = useRef<THREE.MeshBasicMaterial>(null);
  const backOffMat = useRef<THREE.MeshBasicMaterial>(null);
  const backOnMat = useRef<THREE.MeshBasicMaterial>(null);
  const frameMat = useRef<THREE.MeshBasicMaterial>(null);

  const opacity = useRef({ video: 0, stage: 0 });
  const revealed = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const texRef = useRef<THREE.VideoTexture | null>(null);

  const [backOffMap, backOnMap, frameMap] = useTexture([
    '/hotspots/crt_backing_off.webp',
    '/hotspots/crt_backing_playing.webp',
    '/hotspots/crt_frame.webp',
  ]);

  const playing = activeId === 'crt-tv' && armed;
  const [x, y, z] = useMemo(
    () => uvToSpherical(crt.u, crt.v, SPHERE_RADIUS - 0.8),
    [],
  );

  const screenW = crt.w * SCREEN_W_FAC;
  const screenH = crt.h * SCREEN_H_FAC;
  const frameW = crt.w * FRAME_W_FAC;
  const frameH = crt.h * FRAME_H_FAC;

  useLayoutEffect(() => {
    backOffMap.colorSpace = THREE.SRGBColorSpace;
    backOnMap.colorSpace = THREE.SRGBColorSpace;
    frameMap.colorSpace = THREE.SRGBColorSpace;
  }, [backOffMap, backOnMap, frameMap]);

  useLayoutEffect(() => {
    const video = document.createElement('video');
    video.src = src;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.playsInline = true;
    video.muted = true;
    video.preload = 'auto';
    videoRef.current = video;

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    texRef.current = tex;
    if (videoMat.current) {
      videoMat.current.map = tex;
      videoMat.current.needsUpdate = true;
    }

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      tex.dispose();
      videoRef.current = null;
      texRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = src || CRT_DEFAULT_SRC;
    const current = video.getAttribute('src') || '';
    if (current === next) return;
    const wasPlaying = !video.paused;
    video.src = next;
    video.setAttribute('src', next);
    video.load();
    if (wasPlaying || playing) {
      void video.play().catch(() => {});
    }
  }, [src, playing]);

  useEffect(() => {
    if (videoMat.current && texRef.current && videoMat.current.map !== texRef.current) {
      videoMat.current.map = texRef.current;
      videoMat.current.needsUpdate = true;
    }
  }, [playing, src]);

  useLayoutEffect(() => {
    group.current?.lookAt(origin);
  }, [x, y, z]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setBgmDucked(playing);
    const fade = reduceMotion ? 0 : 0.4;
    const volDur = reduceMotion ? 0 : 0.6;

    if (playing) {
      if (!revealed.current) {
        revealed.current = true;
        gsap.fromTo(
          opacity.current,
          { video: 0, stage: 0 },
          {
            video: 1,
            stage: 1,
            duration: fade,
            ease: 'power1.inOut',
            overwrite: true,
          },
        );
      } else {
        gsap.to(opacity.current, {
          video: 1,
          stage: 1,
          duration: fade,
          ease: 'power1.inOut',
          overwrite: true,
        });
      }
      video.muted = false;
      video.volume = 0;
      const vol = { v: 0 };
      gsap.to(vol, {
        v: 0.55,
        duration: volDur,
        ease: 'power1.inOut',
        onUpdate: () => {
          video.volume = vol.v;
        },
      });
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    } else {
      gsap.to(opacity.current, {
        video: 0,
        stage: 0,
        duration: reduceMotion ? 0 : 0.35,
        ease: 'power1.inOut',
        overwrite: true,
      });
      video.muted = true;
      video.volume = 0;
      video.pause();
    }

    return () => setBgmDucked(false);
  }, [playing, reduceMotion]);

  useFrame(() => {
    const { video: vA, stage: sA } = opacity.current;
    if (videoMat.current) videoMat.current.opacity = vA;
    // Off backing fades out as video comes in; playing black sits behind tube
    if (backOffMat.current) backOffMat.current.opacity = sA * (1 - vA * 0.92);
    if (backOnMat.current) backOnMat.current.opacity = sA * Math.min(1, vA + 0.15);
    if (frameMat.current) frameMat.current.opacity = sA;
    if (texRef.current) texRef.current.needsUpdate = true;
  });

  return (
    <group ref={group} position={[x, y, z]}>
      {/* z: slightly in front of sphere wall; stack like BT zorder.
          Screen stack is XY-biased onto the painted glass; frame stays on chassis. */}
      <mesh
        ref={backOffMesh}
        position={[SCREEN_OX, SCREEN_OY, 0.01]}
        renderOrder={2}
        raycast={() => null}
      >
        <planeGeometry args={[screenW * 1.04, screenH * 1.04]} />
        <meshBasicMaterial
          ref={backOffMat}
          map={backOffMap}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={backOnMesh}
        position={[SCREEN_OX, SCREEN_OY, 0.015]}
        renderOrder={3}
        raycast={() => null}
      >
        <planeGeometry args={[screenW * 1.02, screenH * 1.02]} />
        <meshBasicMaterial
          ref={backOnMat}
          map={backOnMap}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={videoMesh}
        position={[SCREEN_OX, SCREEN_OY, 0.03]}
        renderOrder={4}
        raycast={() => null}
      >
        <planeGeometry args={[screenW, screenH]} />
        <meshBasicMaterial
          ref={videoMat}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={frameMesh} position={[0, 0, 0.045]} renderOrder={5} raycast={() => null}>
        <planeGeometry args={[frameW, frameH]} />
        <meshBasicMaterial
          ref={frameMat}
          map={frameMap}
          toneMapped={false}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
