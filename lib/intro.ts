import gsap from 'gsap';

import type { Controls } from '@/app/components/sceneContext';
import {
  FISHEYE_EXPLORE,
  FISHEYE_INTRO,
  INTRO_DELAY,
  INTRO_DROP_V,
  INTRO_DUR,
  INTRO_EXPLORE_EASE_DUR,
  INTRO_PAN_DEG,
  INTRO_REDUCED_DUR,
  MFOV_INTRO,
  MFOV_INTRO_SETTLE,
  START_LOOK_U,
  START_LOOK_V,
  uToYaw,
  vToPitch,
} from '@/lib/pano';
import { resolveExploreMfov } from '@/lib/navigation/CameraController';
import { measureViewport } from '@/lib/navigation/ViewportManager';

export type IntroLookRefs = {
  yaw: { current: number };
  pitch: { current: number };
  fisheye: { current: number };
};

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

const wrapYaw = (y: number) => {
  let v = y % TWO_PI;
  if (v > Math.PI) v -= TWO_PI;
  if (v < -Math.PI) v += TWO_PI;
  return v;
};

const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/**
 * Enter choreography — balmingtiger clickIntro parity (mobile-safe zoom):
 *   1. Pre-enter: near-ceiling little-planet (fisheye 1 / fov 160)
 *   2. Soft yaw pan + tilt down into aisle middle while fov → MFOV_INTRO_SETTLE
 *      (device-agnostic — not portrait-adapted explore, which kills zoom on iPhone)
 *   3. Unlock look, then ease FOV into portrait-aware explore for free-look
 */
export function playEnterIntro(
  controls: Controls,
  refs: IntroLookRefs,
  opts: { reduceMotion?: boolean; onComplete?: () => void } = {},
): gsap.core.Timeline {
  const settleYaw = uToYaw(START_LOOK_U);
  const settlePitch = vToPitch(START_LOOK_V);
  const dropPitch = vToPitch(INTRO_DROP_V);
  const startYaw = wrapYaw(settleYaw - INTRO_PAN_DEG * DEG);
  const exploreMfov = resolveExploreMfov(measureViewport());

  const applyLook = (yaw: number, pitch: number, mfov: number, fisheye: number) => {
    controls.lookTarget.x = yaw;
    controls.lookTarget.y = pitch;
    controls.mfov = mfov;
    controls.fisheye = fisheye;
    refs.yaw.current = yaw;
    refs.pitch.current = pitch;
    refs.fisheye.current = fisheye;
    controls.velocity.x = 0;
    controls.velocity.y = 0;
  };

  const unlockLook = () => {
    controls.lookAnimating = false;
    controls.userControl = true;
    if (typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches) {
      controls.followFactor = 1;
    }
  };

  // Drop pose under the gate / first enter frame — ceiling swirl at room middle
  applyLook(startYaw, dropPitch, MFOV_INTRO, FISHEYE_INTRO);
  controls.userControl = false;
  controls.followFactor = 0;
  controls.lookAnimating = true;

  const tl = gsap.timeline({
    onComplete: () => opts.onComplete?.(),
  });

  const proxy = { t: 0, mfov: MFOV_INTRO, fisheye: FISHEYE_INTRO };

  if (opts.reduceMotion) {
    // Short readable tilt — never an instant wide snap on iOS Reduce Motion.
    tl.to(proxy, {
      t: 1,
      duration: INTRO_REDUCED_DUR,
      ease: 'power2.out',
      onUpdate: () => {
        const u = smoothstep(proxy.t);
        const yaw = startYaw + (settleYaw - startYaw) * u;
        const pitch = dropPitch + (settlePitch - dropPitch) * u;
        const mfov = MFOV_INTRO + (MFOV_INTRO_SETTLE - MFOV_INTRO) * u;
        const fish = FISHEYE_INTRO + (FISHEYE_EXPLORE - FISHEYE_INTRO) * u;
        applyLook(yaw, pitch, mfov, fish);
      },
      onComplete: () => {
        applyLook(settleYaw, settlePitch, MFOV_INTRO_SETTLE, FISHEYE_EXPLORE);
        unlockLook();
      },
    });
  } else {
    tl.fromTo(
      proxy,
      { t: 0, mfov: MFOV_INTRO, fisheye: FISHEYE_INTRO },
      {
        t: 1,
        mfov: MFOV_INTRO_SETTLE,
        fisheye: FISHEYE_EXPLORE,
        duration: INTRO_DUR,
        delay: INTRO_DELAY,
        ease: 'power3.inOut',
        onUpdate: () => {
          const u = smoothstep(proxy.t);
          // Ceiling → aisle middle with soft yaw pan (BT clickIntro language).
          const yaw = startYaw + (settleYaw - startYaw) * u;
          const pitch = dropPitch + (settlePitch - dropPitch) * u;
          applyLook(yaw, pitch, proxy.mfov, proxy.fisheye);
        },
        onComplete: () => {
          applyLook(settleYaw, settlePitch, MFOV_INTRO_SETTLE, FISHEYE_EXPLORE);
          unlockLook();
        },
      },
    );
  }

  // Portrait free-look widen after the cinematic zoom has already read.
  if (Math.abs(exploreMfov - MFOV_INTRO_SETTLE) >= 0.5) {
    const easeProxy = { mfov: MFOV_INTRO_SETTLE };
    tl.to(easeProxy, {
      mfov: exploreMfov,
      duration: opts.reduceMotion ? 0.2 : INTRO_EXPLORE_EASE_DUR,
      ease: 'power2.out',
      onUpdate: () => {
        controls.mfov = easeProxy.mfov;
      },
      onComplete: () => {
        controls.mfov = exploreMfov;
      },
    });
  }

  return tl;
}
