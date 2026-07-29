import gsap from 'gsap';
import type { Section } from '@/app/data/sections';
import { SECTION_BY_ID } from '@/app/data/sections';
import {
  FOLLOW_REENABLE_DELAY,
  FOLLOW_REENABLE_DUR,
} from '@/lib/pano';
import { playSfx, setPanelDuck, stopPreview } from '@/lib/audio';
import {
  animateCamera,
  animateCameraPath,
  interruptCameraAnimation,
} from './AnimationManager';
import {
  aisleWaypoint,
  frontLookTarget,
  resolveExploreMfov,
  resolveLookTarget,
  writeCamera,
} from './CameraController';
import { clearFocus, setFocused } from './StateManager';
import type { Controls, NavFocusState, ViewportMetrics } from './types';
import { measureViewport } from './ViewportManager';

export type NavigationCallbacks = {
  onActiveChange: (id: string | null) => void;
  onFocusedChange: (id: string | null) => void;
  onCrtArm?: (armed: boolean) => void;
  onCrtSrcReset?: () => void;
  reduceMotion: boolean;
};

/** balmingtiger lookto(..., tween(easeinoutquart, 2), ...) — slightly longer for walk. */
const LOOKTO_DURATION = 2.15;
const LOOKTO_AISLE_DURATION = 0.9;
const LOOKTO_APPROACH_DURATION = 1.35;
const REFRAME_DURATION = 0.45;
/**
 * Panel HUD lands mid-lookto so camera + glass feel like one gesture.
 * Glow/focus latch is immediate; panel open is staged.
 */
const PANEL_REVEAL_DELAY = 0.72;

/**
 * High-level navigation — open / close / resetToFront.
 * Owns focus state + camera lookto; never uses anchors or page scroll.
 *
 * Canvas model (BT parity):
 *   - open → lookto feature + open glass HUD (same continuous sphere)
 *   - soft close (BACK / Esc / nav toggle) → clear HUD; keep aim; restore explore FOV
 *   - CRT drag-end → resetToFront (BT video Observer onDragEnd)
 *   - other sections stay focused while the user pans (one room, HUD open)
 *   - Shop opens the counter panel in-room (no eject to /shop)
 */
export function createNavigationController(
  controls: Controls,
  navState: NavFocusState,
  cbs: NavigationCallbacks,
) {
  let openedAt = 0;
  let lookEnabled = false;
  let panelRevealCall: gsap.core.Tween | null = null;

  const setLookEnabled = (v: boolean) => {
    lookEnabled = v;
  };

  const cancelPanelReveal = () => {
    panelRevealCall?.kill();
    panelRevealCall = null;
  };

  const notifyCleared = () => {
    cancelPanelReveal();
    cbs.onActiveChange(null);
    cbs.onFocusedChange(null);
    cbs.onCrtArm?.(false);
    cbs.onCrtSrcReset?.();
    stopPreview();
    setPanelDuck(false, 0.45);
  };

  /** Desktop follow-mouse lean — same timing as InteractionManager mouseup. */
  const scheduleFollowRestore = () => {
    if (cbs.reduceMotion) return;
    // Touch / coarse pointers never use follow lean.
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    gsap.killTweensOf(controls, 'followFactor');
    gsap.delayedCall(FOLLOW_REENABLE_DELAY, () => {
      if (navState.focusedId || controls.lookAnimating || controls.dragging) return;
      gsap.to(controls, {
        followFactor: 1,
        duration: FOLLOW_REENABLE_DUR,
        ease: 'power1.out',
        overwrite: true,
      });
    });
  };

  /**
   * Soft close — BT BACK / closeAllPanels.
   * Clears focus + panel + glow latch; keeps yaw / pitch.
   * Restores explore MFOV so punch-ins (Shop/CRT/Contact) don’t leave
   * the room feeling tunnelled after the HUD closes.
   */
  const close = (opts?: { force?: boolean; silent?: boolean }) => {
    if (!navState.panelOpen && !navState.focusedId) return;
    if (!opts?.force && Date.now() - openedAt < 280) return;

    interruptCameraAnimation(controls);
    clearFocus(navState);
    notifyCleared();
    if (!opts?.silent) playSfx('click');

    const explore = resolveExploreMfov(measureViewport());
    if (cbs.reduceMotion) {
      controls.mfov = explore;
      controls.eye.x = 0;
      controls.eye.y = 0;
      controls.eye.z = 0;
      scheduleFollowRestore();
      return;
    }
    animateCamera(
      controls,
      {
        yaw: controls.lookTarget.x,
        pitch: controls.lookTarget.y,
        mfov: explore,
        eye: { x: 0, y: 0, z: 0 },
      },
      { duration: 1.1, onComplete: scheduleFollowRestore },
    );
  };

  /**
   * BT `resetCamera` — lookto front explore framing + clear focus.
   * Used when the user drags away from the CRT (video) focus.
   */
  const resetToFront = (opts?: { silent?: boolean }) => {
    if (!navState.focusedId && !navState.panelOpen) {
      // Still allow an explicit home snap when already free.
    } else {
      clearFocus(navState);
      notifyCleared();
    }
    interruptCameraAnimation(controls);
    if (!opts?.silent) playSfx('click');

    const viewport = measureViewport();
    if (cbs.reduceMotion) {
      writeCamera(controls, frontLookTarget(viewport));
      controls.velocity.x = 0;
      controls.velocity.y = 0;
      scheduleFollowRestore();
      return;
    }
    animateCamera(controls, frontLookTarget(viewport), {
      duration: LOOKTO_DURATION,
      onComplete: scheduleFollowRestore,
    });
  };

  const revealPanel = (id: string) => {
    if (navState.focusedId !== id) return;
    navState.activeId = id;
    navState.panelOpen = true;
    cbs.onActiveChange(id);
    setPanelDuck(true, 0.6);
  };

  const open = (id: string, viewport?: ViewportMetrics) => {
    // Gate on the shared controls flag the intro sets — avoids a stale
    // closed-over `lookEnabled` boolean after controller recreation.
    if (!controls.userControl && !lookEnabled) return;
    lookEnabled = true;
    const section = SECTION_BY_ID[id];
    if (!section) return;

    // Toggle off if same focused feature re-clicked via nav / hotspot.
    if (navState.focusedId === id) {
      close({ force: true });
      return;
    }

    openedAt = Date.now();
    cancelPanelReveal();
    cbs.onCrtArm?.(false);
    if (id !== 'crt-tv') cbs.onCrtSrcReset?.();
    // Leaving Music/Shop stops any booth preview.
    stopPreview();

    const vp = viewport ?? measureViewport();
    const target = resolveLookTarget(section, vp);
    const fromFree = !navState.focusedId;

    // Glow/focus latches immediately; HUD opens mid-lookto from free look.
    // Section→section swaps keep the glass up (no close flicker).
    setFocused(navState, id, {
      panel: false,
      readyDelayMs:
        fromFree && !cbs.reduceMotion ? PANEL_REVEAL_DELAY * 1000 : 0,
    });
    navState.focusedId = id;
    cbs.onFocusedChange(id);
    playSfx(section.sfx || 'focus');

    // Keep follow-mouse lean off while focused so glow stays framed.
    gsap.killTweensOf(controls, 'followFactor');
    controls.followFactor = 0;

    // Videos — arm watch overlay when lookto lands (or immediately if reduced).
    const armCrt =
      id === 'crt-tv' && (SECTION_BY_ID['crt-tv']?.items.length ?? 0) > 0;

    if (cbs.reduceMotion) {
      interruptCameraAnimation(controls);
      writeCamera(controls, target);
      revealPanel(id);
      if (armCrt) cbs.onCrtArm?.(true);
      return;
    }

    if (fromFree) {
      navState.activeId = null;
      navState.panelOpen = false;
      cbs.onActiveChange(null);
      panelRevealCall = gsap.delayedCall(PANEL_REVEAL_DELAY, () => {
        panelRevealCall = null;
        revealPanel(id);
      });
    } else {
      revealPanel(id);
    }

    // Section→section: step into the aisle, turn, then approach the wall.
    // Free look → feature: single approach (already standing in the room).
    const eyeDist = Math.hypot(controls.eye.x, controls.eye.y, controls.eye.z);
    const yawSpan = Math.abs(
      ((target.yaw - controls.lookTarget.x + Math.PI) % (Math.PI * 2) + Math.PI * 2) %
        (Math.PI * 2) -
        Math.PI,
    );
    const shouldWalk =
      (!fromFree && yawSpan > 0.55) || (fromFree && yawSpan > 1.2 && eyeDist < 0.5);

    if (shouldWalk) {
      const mid = aisleWaypoint(controls.lookTarget.x, target, vp);
      animateCameraPath(controls, [mid, target], {
        segmentDurations: [LOOKTO_AISLE_DURATION, LOOKTO_APPROACH_DURATION],
        onComplete: () => {
          if (armCrt && navState.focusedId === id) cbs.onCrtArm?.(true);
        },
      });
    } else {
      animateCamera(controls, target, {
        duration: LOOKTO_DURATION,
        onComplete: () => {
          if (armCrt && navState.focusedId === id) cbs.onCrtArm?.(true);
        },
      });
    }
  };

  /**
   * After rotate / iOS chrome resize: keep yaw/pitch, re-adapt MFOV
   * (lookto while focused, explore HFOV while free-looking).
   */
  const reframeFocused = (viewport?: ViewportMetrics) => {
    if (controls.lookAnimating || controls.dragging) return;
    const vp = viewport ?? measureViewport();
    const id = navState.focusedId;

    const nextMfov = id
      ? (() => {
          const section = SECTION_BY_ID[id];
          return section ? resolveLookTarget(section, vp).mfov : null;
        })()
      : resolveExploreMfov(vp);
    if (nextMfov == null) return;
    if (Math.abs(controls.mfov - nextMfov) < 1.5) return;

    if (cbs.reduceMotion) {
      controls.mfov = nextMfov;
      return;
    }
    animateCamera(
      controls,
      {
        yaw: controls.lookTarget.x,
        pitch: controls.lookTarget.y,
        mfov: nextMfov,
      },
      { duration: REFRAME_DURATION },
    );
  };

  const interruptLook = () => {
    interruptCameraAnimation(controls);
  };

  return {
    open,
    close,
    /** @deprecated Prefer resetToFront (CRT) or close (soft). Kept for callers. */
    freeFocus: (opts?: { silent?: boolean }) => {
      // Legacy name: restore explore FOV, keep aim — used nowhere after refactor.
      if (!navState.focusedId && !navState.panelOpen) return;
      interruptCameraAnimation(controls);
      clearFocus(navState);
      notifyCleared();
      if (!opts?.silent) playSfx('click');
      const explore = resolveExploreMfov(measureViewport());
      if (cbs.reduceMotion) {
        controls.mfov = explore;
        scheduleFollowRestore();
        return;
      }
      animateCamera(
        controls,
        {
          yaw: controls.lookTarget.x,
          pitch: controls.lookTarget.y,
          mfov: explore,
        },
        { duration: 1.1, onComplete: scheduleFollowRestore },
      );
    },
    resetToFront,
    reframeFocused,
    interruptLook,
    setLookEnabled,
    getSection: (id: string): Section | undefined => SECTION_BY_ID[id],
  };
}

export type NavigationController = ReturnType<typeof createNavigationController>;
