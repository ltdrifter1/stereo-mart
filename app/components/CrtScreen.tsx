'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { HOTSPOT_BY_ID } from '@/app/data/hotspots';
import { setBgmDucked } from '@/lib/audio';

const origin = new THREE.Vector3(0, 0, 0);
const crt = HOTSPOT_BY_ID['crt-tv'];
/** Branded STEREO-MART station ID — not SMPTE color bars. */
export const CRT_DEFAULT_SRC = '/videos/channel_b.mp4';

/**
 * In-world CRT — video sits on the painted tube glass (no v13 bezel overlays).
 * Alpha 0 until Videos is focused + armed (post-lookto).
 */
const SCREEN_W_FAC = 0.62;
const SCREEN_H_FAC = 0.52;
const SCREEN_OY = 0.15;

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
  const videoMat = useRef<THREE.MeshBasicMaterial>(null);
  const backMat = useRef<THREE.MeshBasicMaterial>(null);
  const opacity = useRef({ video: 0, stage: 0 });
  const revealed = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const texRef = useRef<THREE.VideoTexture | null>(null);

  const playing = activeId === 'crt-tv' && armed;
  const [x, y, z] = useMemo(
    () => uvToSpherical(crt.u, crt.v, SPHERE_RADIUS - 0.8),
    [],
  );

  const screenW = crt.w * SCREEN_W_FAC;
  const screenH = crt.h * SCREEN_H_FAC;

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
    if (backMat.current) backMat.current.opacity = sA * (1 - vA * 0.85);
    if (texRef.current) texRef.current.needsUpdate = true;
  });

  return (
    <group ref={group} position={[x, y, z]}>
      <mesh position={[0, SCREEN_OY, 0.02]} renderOrder={3} raycast={() => null}>
        <planeGeometry args={[screenW * 1.06, screenH * 1.08]} />
        <meshBasicMaterial
          ref={backMat}
          color="#1a1410"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, SCREEN_OY, 0.04]} renderOrder={4} raycast={() => null}>
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
    </group>
  );
}
