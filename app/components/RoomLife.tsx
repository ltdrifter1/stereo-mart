'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { SPHERE_RADIUS, uvToSpherical } from '@/lib/pano';
import { LAMP_ATH, LAMP_ATV } from '@/app/data/hotspots';
import {
  CLOUD_LIFE,
  FAN_LIFE,
  LIFE_INSET,
  LAMP_FLICKER,
  SPEAKER_LIFE,
  angToPlane,
  cloudWindowFade,
  lifeUv,
  wrapCloudAth,
} from '@/lib/roomLife';
import { useSceneEnv } from './sceneContext';

const origin = new THREE.Vector3(0, 0, 0);

function useBillboard(
  ath: number,
  atv: number,
  inset = LIFE_INSET,
): { mesh: RefObject<THREE.Mesh | null>; pos: [number, number, number] } {
  const mesh = useRef<THREE.Mesh>(null);
  const { u, v } = lifeUv(ath, atv);
  const pos = uvToSpherical(u, v, SPHERE_RADIUS - inset) as [number, number, number];
  const [x, y, z] = pos;
  useLayoutEffect(() => {
    mesh.current?.lookAt(origin);
  }, [x, y, z]);
  return { mesh, pos };
}

function FanSpin() {
  const cover = useBillboard(FAN_LIFE.ath, FAN_LIFE.atv, 1.05);
  const blades = useBillboard(FAN_LIFE.ath, FAN_LIFE.atv, 1.15);
  const env = useSceneEnv();
  const [coverMap, bladeMap] = useTexture([FAN_LIFE.coverSrc, FAN_LIFE.src]);
  const w = angToPlane(FAN_LIFE.wdeg);
  const h = angToPlane(FAN_LIFE.hdeg);

  useLayoutEffect(() => {
    coverMap.colorSpace = THREE.SRGBColorSpace;
    bladeMap.colorSpace = THREE.SRGBColorSpace;
  }, [coverMap, bladeMap]);

  useFrame((_, delta) => {
    const m = blades.mesh.current;
    if (!m) return;
    m.lookAt(origin);
    cover.mesh.current?.lookAt(origin);
    if (env.reduceMotion) return;
    m.rotation.z -= delta * FAN_LIFE.radPerSec;
  });

  return (
    <group>
      <mesh ref={cover.mesh} position={cover.pos} renderOrder={3} raycast={() => null}>
        <planeGeometry args={[w * 1.06, h * 1.06]} />
        <meshBasicMaterial
          map={coverMap}
          transparent
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={blades.mesh} position={blades.pos} renderOrder={4} raycast={() => null}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          map={bladeMap}
          transparent
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function SpeakerPulse() {
  const { mesh, pos } = useBillboard(SPEAKER_LIFE.ath, SPEAKER_LIFE.atv, 0.95);
  const env = useSceneEnv();
  const map = useTexture(SPEAKER_LIFE.src);
  const w = angToPlane(SPEAKER_LIFE.wdeg);
  const h = angToPlane(SPEAKER_LIFE.hdeg);

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.lookAt(origin);
    if (env.reduceMotion) {
      m.scale.setScalar(1);
      return;
    }
    const listen = env.listening.value;
    const hz = listen ? SPEAKER_LIFE.listenHz : SPEAKER_LIFE.idleHz;
    const amp = listen ? SPEAKER_LIFE.listenAmp : SPEAKER_LIFE.idleAmp;
    const s = 1 + amp * (0.5 + 0.5 * Math.sin(env.time * hz * Math.PI * 2));
    m.scale.setScalar(s);
  });

  return (
    <mesh ref={mesh} position={pos} renderOrder={3} raycast={() => null}>
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

function DriftCloud({
  src,
  ath0,
  atv,
  wdeg,
  hdeg,
  degPerSec,
  phase,
}: {
  src: string;
  ath0: number;
  atv: number;
  wdeg: number;
  hdeg: number;
  degPerSec: number;
  phase: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const env = useSceneEnv();
  const map = useTexture(src);
  const w = angToPlane(wdeg);
  const h = angToPlane(hdeg);

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map]);

  useFrame(() => {
    const m = mesh.current;
    const material = mat.current;
    if (!m || !material) return;
    const ath = env.reduceMotion
      ? ath0
      : wrapCloudAth(ath0 + env.time * degPerSec);
    const bob = env.reduceMotion ? 0 : Math.sin(env.time * 0.35 + phase) * 0.35;
    const { u, v } = lifeUv(ath, atv + bob);
    const [x, y, z] = uvToSpherical(u, v, SPHERE_RADIUS - 1.25);
    m.position.set(x, y, z);
    m.lookAt(origin);
    material.opacity = 0.82 * cloudWindowFade(ath);
  });

  return (
    <mesh ref={mesh} renderOrder={2} raycast={() => null}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={mat}
        map={map}
        transparent
        opacity={0.45}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function LampFlicker({ lightsOn }: { lightsOn: boolean }) {
  const { mesh, pos } = useBillboard(LAMP_ATH, LAMP_ATV, 1.4);
  const env = useSceneEnv();
  const map = useTexture(LAMP_FLICKER.src);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const nextDip = useRef(8);
  const dipUntil = useRef(0);
  const w = angToPlane(LAMP_FLICKER.wdeg);

  useLayoutEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map]);

  useFrame(() => {
    const material = mat.current;
    if (!material) return;
    mesh.current?.lookAt(origin);
    if (!lightsOn) {
      material.opacity = 0;
      return;
    }
    if (env.reduceMotion) {
      material.opacity = LAMP_FLICKER.base;
      return;
    }
    const t = env.time;
    if (t > nextDip.current) {
      dipUntil.current = t + 0.12;
      nextDip.current =
        t + LAMP_FLICKER.minGap + Math.random() * (LAMP_FLICKER.maxGap - LAMP_FLICKER.minGap);
    }
    const dipped = t < dipUntil.current;
    material.opacity = dipped ? LAMP_FLICKER.base * 0.35 : LAMP_FLICKER.base;
  });

  return (
    <mesh ref={mesh} position={pos} renderOrder={3} raycast={() => null}>
      <planeGeometry args={[w, w]} />
      <meshBasicMaterial
        ref={mat}
        map={map}
        transparent
        opacity={LAMP_FLICKER.base}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Room-at-rest motion. Cat breathe lives on the find hit in AmbientHits
 * so petting and the plate patch stay one object.
 */
export default function RoomLife({ lightsOn = true }: { lightsOn?: boolean }) {
  return (
    <group>
      <FanSpin />
      <SpeakerPulse />
      {CLOUD_LIFE.map((c) => (
        <DriftCloud
          key={c.id}
          src={c.src}
          ath0={c.ath}
          atv={c.atv}
          wdeg={c.wdeg}
          hdeg={c.hdeg}
          degPerSec={c.degPerSec}
          phase={c.phase}
        />
      ))}
      <LampFlicker lightsOn={lightsOn} />
    </group>
  );
}
