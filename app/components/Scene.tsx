'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';

import {
  DRAG_FRICTION,
  FISHEYE_INTRO,
  FOLLOW_RANGE_DEG,
  FOLLOW_SPEED,
  FRICTION_STOP,
  INTRO_DROP_V,
  LQIP_SRC,
  MFOV_INTRO,
  SPHERE_RADIUS,
  START_LOOK_U,
  TEXTURE_OFF_SRC,
  TEXTURE_SRC,
  autoPitchLimit,
  followZoomScale,
  mfovToVerticalFov,
  uToYaw,
  vToPitch,
} from '@/lib/pano';
import { playEnterIntro } from '@/lib/intro';
import type { GyroHandle } from '@/lib/gyro';
import { SECTIONS } from '@/app/data/sections';
import { SceneContext, type SceneEnv, type Controls } from './sceneContext';
import DustField from './DustField';
import LightBeams from './LightBeams';
import Hotspot from './Hotspot';
import LampHotspot from './LampHotspot';
import FisheyePass from './FisheyePass';
import CrtScreen, { CRT_DEFAULT_SRC } from './CrtScreen';
import AmbientHits from './AmbientHits';

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const FOLLOW_RANGE = FOLLOW_RANGE_DEG * DEG;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

type Props = {
  controls: Controls;
  reduceMotion: boolean;
  /** Flips true when the gate opens — starts the intro FOV/fisheye ease. */
  enteredRef: { value: boolean };
  /** Hotspots live only after intro unlocks look. */
  liveRef: { value: boolean };
  panelOpenRef: { value: boolean };
  focusedIdRef?: { value: string | null };
  /** Soft hotspot invite until performance.now() (0 = off). */
  inviteUntilRef?: { value: number };
  /** Booth preview currently playing — Music glow “now playing” pulse. */
  listeningRef?: { value: boolean };
  onOpen: (id: string) => void;
  onIntroComplete?: () => void;
  debug?: boolean;
  lightsOn?: boolean;
  onToggleLights?: () => void;
  activeId?: string | null;
  /** Glow latch — stays on while lookto-focused. */
  focusedId?: string | null;
  crtArmed?: boolean;
  /** Current CRT channel URL. */
  crtSrc?: string;
  gyroRef?: { current: GyroHandle };
};

/**
 * Camera rig — balmingtiger / krpano parity + cinematic enter:
 * - Enter: ceiling little-planet → soft yaw pan → aisle middle
 *   while MFOV 160→124 (device-agnostic) + fisheye 1→0.3, then ease to explore
 * - Look locked during intro; usercontrol=all on complete
 * - Click-and-drag with instant tracking + draginertia/dragfriction
 * - followmousecontrol lean on desktop (view.rx / view.ry)
 * - No artificial camera breath/position wobble
 */
function Rig({
  controls,
  env,
  enteredRef,
  onIntroComplete,
  fisheyeRef,
  gyroRef,
}: {
  controls: Controls;
  env: SceneEnv;
  enteredRef: { value: boolean };
  onIntroComplete?: () => void;
  fisheyeRef: { current: number };
  gyroRef?: { current: GyroHandle };
}) {
  const { camera, size } = useThree();
  const settleYaw = uToYaw(START_LOOK_U);
  const dropPitch = vToPitch(INTRO_DROP_V);
  const yaw = useRef(settleYaw);
  const pitch = useRef(dropPitch);
  const followYaw = useRef(0);
  const followPitch = useRef(0);
  const wasEntered = useRef(false);
  const introDone = useRef(false);
  const introTween = useRef<gsap.core.Timeline | null>(null);
  const onIntroCompleteRef = useRef(onIntroComplete);
  onIntroCompleteRef.current = onIntroComplete;

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.near = 0.1;
    cam.far = SPHERE_RADIUS * 3;
    cam.position.set(0, 0, 0);
    cam.rotation.order = 'YXZ';
    // Pre-enter: aimed near the ceiling so CLICK TO ENTER reveals the
    // little-planet drop before tilting into the aisle middle.
    controls.lookTarget.x = settleYaw;
    controls.lookTarget.y = dropPitch;
    controls.velocity.x = 0;
    controls.velocity.y = 0;
    controls.mfov = MFOV_INTRO;
    controls.fisheye = FISHEYE_INTRO;
    controls.followFactor = 0;
    controls.userControl = false;
    controls.lookAnimating = false;
    fisheyeRef.current = FISHEYE_INTRO;
    yaw.current = settleYaw;
    pitch.current = dropPitch;
    followYaw.current = 0;
    followPitch.current = 0;
    wasEntered.current = false;
    introDone.current = false;
    return () => {
      introTween.current?.kill();
    };
  }, [camera, controls, settleYaw, dropPitch, fisheyeRef]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    env.time = t;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const dt = Math.min(0.05, delta);

    // —— Intro: ceiling → pan → settle aisle middle ——
    if (enteredRef.value && !wasEntered.current) {
      wasEntered.current = true;
      introTween.current?.kill();
      introTween.current = playEnterIntro(
        controls,
        { yaw, pitch, fisheye: fisheyeRef },
        {
          reduceMotion: env.reduceMotion,
          onComplete: () => {
            introDone.current = true;
            onIntroCompleteRef.current?.();
          },
        },
      );
    }

    cam.fov = mfovToVerticalFov(controls.mfov, aspect);
    cam.updateProjectionMatrix();

    const looking = introDone.current;
    const maxPitch = autoPitchLimit(controls.mfov, aspect);

    if (!looking) {
      // Intro owns lookTarget / yaw / pitch via playEnterIntro onUpdate
      yaw.current = controls.lookTarget.x;
      pitch.current = controls.lookTarget.y;
    } else {
      controls.lookTarget.y = THREE.MathUtils.clamp(
        controls.lookTarget.y,
        -maxPitch,
        maxPitch,
      );

      if (controls.dragging) {
        // krpano mode="drag": view follows instantly while held
        yaw.current = controls.lookTarget.x;
        pitch.current = controls.lookTarget.y;
      } else {
        // Inertia after release (dragfriction per 60fps frame)
        if (!env.reduceMotion) {
          const spd = Math.hypot(controls.velocity.x, controls.velocity.y);
          if (spd > FRICTION_STOP) {
            controls.lookTarget.x = wrapYaw(
              controls.lookTarget.x + controls.velocity.x * dt,
            );
            controls.lookTarget.y = THREE.MathUtils.clamp(
              controls.lookTarget.y + controls.velocity.y * dt,
              -maxPitch,
              maxPitch,
            );
            const decay = Math.pow(DRAG_FRICTION, dt * 60);
            controls.velocity.x *= decay;
            controls.velocity.y *= decay;
          } else {
            controls.velocity.x = 0;
            controls.velocity.y = 0;
          }
        } else {
          controls.velocity.x = 0;
          controls.velocity.y = 0;
        }

        // Instant catch-up to target (drag mode, not follow-smooth mode)
        yaw.current = controls.lookTarget.x;
        pitch.current = controls.lookTarget.y;
      }
    }

    // —— followmousecontrol: view.rx / view.ry lean ——
    let fYaw = 0;
    let fPitch = 0;
    // Follow-mouse lean off while a section is focused — keeps glow framing locked.
    const followAllowed =
      looking &&
      !env.reduceMotion &&
      !env.focusedId.value &&
      controls.followFactor > 0.001;
    if (followAllowed) {
      const z = followZoomScale(controls.mfov, aspect);
      const amp = (controls.followFactor / z) * FOLLOW_RANGE;
      const targetYaw = -controls.pointer.x * amp;
      const targetPitch = -controls.pointer.y * amp;
      followYaw.current += (targetYaw - followYaw.current) * FOLLOW_SPEED;
      followPitch.current += (targetPitch - followPitch.current) * FOLLOW_SPEED;
      fYaw = followYaw.current;
      fPitch = followPitch.current;
    } else {
      followYaw.current *= 1 - FOLLOW_SPEED;
      followPitch.current *= 1 - FOLLOW_SPEED;
      fYaw = followYaw.current;
      fPitch = followPitch.current;
    }

    // Mobile gyro offset (krpano gyro plugin) — skipped while dragging
    let gYaw = 0;
    let gPitch = 0;
    const gyro = gyroRef?.current;
    if (
      looking &&
      gyro?.enabled &&
      !controls.dragging &&
      !controls.lookAnimating &&
      !env.focusedId.value
    ) {
      gYaw = gyro.yaw;
      gPitch = gyro.pitch;
    }

    env.look.x = yaw.current + fYaw + gYaw;
    env.look.y = THREE.MathUtils.clamp(
      pitch.current + fPitch + gPitch,
      -maxPitch,
      maxPitch,
    );

    camera.rotation.order = 'YXZ';
    camera.rotation.y = env.look.x;
    camera.rotation.x = env.look.y;
    camera.rotation.z = 0;
    // Walk eye offset — standing nearer a wall instead of FOV-only zoom.
    camera.position.set(controls.eye.x, controls.eye.y, controls.eye.z);
  }, -1);

  return null;
}

function prepTex(tex: THREE.Texture, gl: THREE.WebGLRenderer) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = true;
  // BackSide equirect sphere mirrors U — flip so poster/sign text reads LTR.
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
  // Higher anisotropy + mipmaps keep walls cleaner when zoomed into the CRT.
  tex.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
}

export default function Scene({
  controls,
  reduceMotion,
  enteredRef,
  liveRef,
  panelOpenRef,
  focusedIdRef = { value: null },
  inviteUntilRef = { value: 0 },
  listeningRef = { value: false },
  onOpen,
  onIntroComplete,
  debug = false,
  lightsOn = true,
  onToggleLights,
  activeId = null,
  focusedId = null,
  crtArmed = false,
  crtSrc = CRT_DEFAULT_SRC,
  gyroRef,
}: Props) {
  // Gate Suspense resolves on tiny LQIP — full 4K pans load in the background.
  const texLqip = useTexture(LQIP_SRC);
  const [texOn, setTexOn] = useState<THREE.Texture | null>(null);
  const [texOff, setTexOff] = useState<THREE.Texture | null>(null);
  const { gl } = useThree();
  const fisheyeRef = useRef(FISHEYE_INTRO);
  const lightsBlend = useRef({ v: lightsOn ? 1 : 0 });
  const hiBlend = useRef({ v: 0 });
  const matLqip = useRef<THREE.MeshBasicMaterial>(null);
  const matOn = useRef<THREE.MeshBasicMaterial>(null);
  const matOff = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    prepTex(texLqip, gl);
  }, [texLqip, gl]);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    let onTex: THREE.Texture | null = null;
    let offTex: THREE.Texture | null = null;
    Promise.all([loader.loadAsync(TEXTURE_SRC), loader.loadAsync(TEXTURE_OFF_SRC)])
      .then(([on, off]) => {
        if (cancelled) {
          on.dispose();
          off.dispose();
          return;
        }
        prepTex(on, gl);
        prepTex(off, gl);
        onTex = on;
        offTex = off;
        setTexOn(on);
        setTexOff(off);
      })
      .catch(() => {
        /* keep LQIP if full pans fail */
      });
    return () => {
      cancelled = true;
      onTex?.dispose();
      offTex?.dispose();
    };
  }, [gl]);

  useEffect(() => {
    if (!texOn || !texOff) return;
    gsap.to(hiBlend.current, {
      v: 1,
      duration: reduceMotion ? 0 : 0.85,
      ease: 'power2.out',
      overwrite: true,
    });
  }, [texOn, texOff, reduceMotion]);

  useEffect(() => {
    gsap.to(lightsBlend.current, {
      v: lightsOn ? 1 : 0,
      duration: reduceMotion ? 0 : 0.85,
      ease: 'power2.inOut',
      overwrite: true,
    });
  }, [lightsOn, reduceMotion]);

  useEffect(() => {
    focusedIdRef.value = focusedId;
  }, [focusedId, focusedIdRef]);

  const env = useMemo<SceneEnv>(
    () => ({
      look: { x: 0, y: 0 },
      time: 0,
      live: liveRef,
      panelOpen: panelOpenRef,
      reduceMotion,
      focusedId: focusedIdRef,
      inviteUntil: inviteUntilRef,
      listening: listeningRef,
    }),
    [liveRef, panelOpenRef, reduceMotion, focusedIdRef, inviteUntilRef, listeningRef],
  );

  useFrame(() => {
    const hi = hiBlend.current.v;
    const on = lightsBlend.current.v;
    if (matLqip.current) matLqip.current.opacity = 1 - hi;
    if (matOn.current) matOn.current.opacity = on * hi;
    if (matOff.current) matOff.current.opacity = (1 - on) * hi;
  });

  return (
    <SceneContext.Provider value={env}>
      <Rig
        controls={controls}
        env={env}
        enteredRef={enteredRef}
        onIntroComplete={onIntroComplete}
        fisheyeRef={fisheyeRef}
        gyroRef={gyroRef}
      />

      <color attach="background" args={['#000000']} />

      {/* Progressive base — sharp enough to enter before 4K lands */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS + 0.04, 64, 48]} />
        <meshBasicMaterial
          ref={matLqip}
          map={texLqip}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={1}
          color="#ffffff"
        />
      </mesh>

      {/* Lights-on sphere (fades in when full texture ready) */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 96, 64]} />
        <meshBasicMaterial
          ref={matOn}
          map={texOn ?? texLqip}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={0}
          color="#ffffff"
        />
      </mesh>

      {/* Lights-off sphere (crossfades) */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.02, 96, 64]} />
        <meshBasicMaterial
          ref={matOff}
          map={texOff ?? texLqip}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
          transparent
          opacity={0}
          color="#ffffff"
        />
      </mesh>

      <group>
        <CrtScreen
          activeId={activeId}
          armed={crtArmed}
          src={crtSrc}
          reduceMotion={reduceMotion}
        />
        <AmbientHits controls={controls} debug={debug} />
        {SECTIONS.map((s) => (
          <Hotspot
            key={s.id}
            section={s}
            onOpen={onOpen}
            controls={controls}
            focusedId={focusedId}
            debug={debug}
          />
        ))}
        {onToggleLights && (
          <LampHotspot controls={controls} lightsOn={lightsOn} onToggle={onToggleLights} />
        )}
      </group>

      {/* Soft tungsten shafts when lights are on — atmospheric, not a redesign */}
      {lightsOn && <LightBeams />}
      <DustField count={reduceMotion ? 0 : 48} />

      <FisheyePass amountRef={fisheyeRef} reduceMotion={reduceMotion} />
    </SceneContext.Provider>
  );
}
