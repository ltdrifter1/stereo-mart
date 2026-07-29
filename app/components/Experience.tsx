'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import Scene from './Scene';
import LoadingGate from './LoadingGate';
import SectionPanel from './SectionPanel';
import FilmFX from './FilmFX';
import TopNav from './TopNav';
import MuteControl from './MuteControl';
import GyroButton, { createGyro } from './GyroButton';
import DragHint from './DragHint';
import CustomCursor from './CustomCursor';
import WonderToast from './WonderToast';
import {
  createNavState,
  createNavigationController,
  measureViewport,
  syncViewportCssVars,
  useInteractionManager,
} from '@/lib/navigation';
import {
  enterWithAudio,
  onPreviewProgress,
  playSfx,
} from '@/lib/audio';
import {
  hashFromSectionId,
  readSectionHash,
  sectionIdFromHash,
} from '@/lib/sectionHash';
import { CRT_DEFAULT_SRC } from './CrtScreen';

/**
 * Root experience — virtual spherical camera, not page scroll.
 * Navigation animates yaw / pitch / MFOV via AnimationManager (rAF).
 *
 * Canvas model (balmingtiger):
 *   one continuous room; panels are HUD; drag-end only resets CRT focus.
 * Hash deep links: /#music /#shop /#contact …
 */
export default function Experience() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const enteredRef = useRef({ value: false });
  const lookEnabledRef = useRef(false);
  const liveRef = useRef({ value: false });
  const panelOpenRef = useRef({ value: false });
  const inviteUntilRef = useRef({ value: 0 });
  const listeningRef = useRef({ value: false });
  const focusedIdRef = useRef<{ value: string | null }>({ value: null });
  const gyroRef = useRef(createGyro());
  const onDragEndRef = useRef<(() => void) | null>(null);
  const onInterruptLookRef = useRef<(() => void) | null>(null);
  const hashBridgeReady = useRef(false);
  const applyingHash = useRef(false);

  const navState = useMemo(() => createNavState(), []);

  const [active, setActive] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [crtArmed, setCrtArmed] = useState(false);
  const [crtSrc, setCrtSrc] = useState(CRT_DEFAULT_SRC);
  const [entered, setEntered] = useState(false);
  const [canLook, setCanLook] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [maxDpr, setMaxDpr] = useState(2);
  const [debug, setDebug] = useState(false);
  const [lightsOn, setLightsOn] = useState(true);

  const controls = useInteractionManager(
    stageRef,
    lookEnabledRef,
    onDragEndRef,
    onInterruptLookRef,
    focusedIdRef,
  );

  const lookEnabledHold = useRef(false);

  const nav = useMemo(
    () => {
      const controller = createNavigationController(controls, navState, {
        onActiveChange: (id) => {
          setActive(id);
          panelOpenRef.current.value = !!id;
        },
        onFocusedChange: (id) => {
          setFocusedId(id);
          focusedIdRef.current.value = id;
        },
        onCrtArm: setCrtArmed,
        onCrtSrcReset: () => setCrtSrc(CRT_DEFAULT_SRC),
        reduceMotion,
      });
      controller.setLookEnabled(lookEnabledHold.current);
      return controller;
    },
    [controls, navState, reduceMotion],
  );

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has('debug'));
  }, []);

  // Booth “now playing” — Music hotspot pulses while a preview is live.
  useEffect(
    () =>
      onPreviewProgress((p) => {
        listeningRef.current.value = Boolean(p.src && p.playing);
      }),
    [],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const on = mq.matches;
      setReduceMotion(on);
      document.documentElement.classList.toggle('reduce-motion', on);
    };
    apply();
    mq.addEventListener('change', apply);

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    setMaxDpr(isTouch ? 1.6 : 2);
    return () => {
      mq.removeEventListener('change', apply);
      document.documentElement.classList.remove('reduce-motion');
    };
  }, []);

  // Keep FX / vignette locked to visualViewport (iOS Safari chrome).
  useEffect(() => {
    const publish = () => {
      const m = measureViewport(stageRef.current);
      syncViewportCssVars(m);
      nav.reframeFocused(m);
    };
    publish();
    const vv = window.visualViewport;
    window.addEventListener('resize', publish);
    vv?.addEventListener('resize', publish);
    vv?.addEventListener('scroll', publish);
    return () => {
      window.removeEventListener('resize', publish);
      vv?.removeEventListener('resize', publish);
      vv?.removeEventListener('scroll', publish);
    };
  }, [nav]);

  const handleEntered = useCallback(async () => {
    lookEnabledRef.current = false;
    lookEnabledHold.current = false;
    nav.setLookEnabled(false);
    liveRef.current.value = false;
    inviteUntilRef.current.value = 0;
    enteredRef.current.value = true;
    setEntered(true);
    setCanLook(false);
    // BGM starts on the same gesture as Enter — under the intro tilt.
    await enterWithAudio();
  }, [nav]);

  const handleIntroComplete = useCallback(() => {
    lookEnabledRef.current = true;
    lookEnabledHold.current = true;
    nav.setLookEnabled(true);
    liveRef.current.value = true;
    // Stronger idle pulse on settle; quieter always-on glow continues after.
    inviteUntilRef.current.value = performance.now() + 4200;
    setCanLook(true);
  }, [nav]);

  useEffect(() => {
    onInterruptLookRef.current = () => nav.interruptLook();
    onDragEndRef.current = () => {
      if (navState.focusedId === 'crt-tv') {
        nav.resetToFront({ silent: true });
      }
    };
    return () => {
      onInterruptLookRef.current = null;
      onDragEndRef.current = null;
    };
  }, [nav, navState]);

  useEffect(() => {
    nav.setLookEnabled(lookEnabledHold.current || canLook);
  }, [nav, canLook]);

  const open = useCallback(
    (id: string) => {
      if (canLook) nav.setLookEnabled(true);
      nav.open(id, measureViewport(stageRef.current));
    },
    [nav, canLook],
  );

  const close = useCallback(() => nav.close(), [nav]);

  // After intro unlock: honor initial hash, then keep URL ↔ panel in sync.
  useEffect(() => {
    if (!canLook) return;

    const initial = readSectionHash();
    if (initial) {
      applyingHash.current = true;
      open(initial);
      window.setTimeout(() => {
        applyingHash.current = false;
      }, 50);
    }
    hashBridgeReady.current = true;

    const onPop = () => {
      const id = sectionIdFromHash(window.location.hash);
      applyingHash.current = true;
      if (id) open(id);
      else close();
      window.setTimeout(() => {
        applyingHash.current = false;
      }, 50);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [canLook, open, close]);

  // Push history when the user opens/closes a section (not during popstate/hash apply).
  useEffect(() => {
    if (!hashBridgeReady.current || applyingHash.current) return;
    if (typeof window === 'undefined') return;

    const next = hashFromSectionId(active);
    const url = `${window.location.pathname}${window.location.search}${next}`;
    const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === cur) return;

    window.history.pushState(active ? { sectionId: active } : {}, '', url);
  }, [active]);

  // Inert the WebGL surface while a panel is open (keyboard trap lives in SectionPanel).
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    if (active) wrap.setAttribute('inert', '');
    else wrap.removeAttribute('inert');
  }, [active]);

  const playCrt = useCallback((src: string) => {
    setCrtSrc(src || CRT_DEFAULT_SRC);
    if (navState.focusedId === 'crt-tv' || navState.activeId === 'crt-tv') {
      setCrtArmed(true);
    }
  }, [navState]);

  const toggleLights = useCallback(() => {
    setLightsOn((v) => !v);
    playSfx('lights');
  }, []);

  const videoFocused = active === 'crt-tv';

  return (
    <div className={`stage${canLook ? ' can-look' : ''}`} ref={stageRef}>
      <div className="stage-canvas" ref={canvasWrapRef}>
        <Canvas
          dpr={[1, maxDpr]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
          }}
          camera={{ fov: 120, position: [0, 0, 0], near: 0.1, far: 200 }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor('#000000', 1);
            camera.rotation.order = 'YXZ';
          }}
        >
          <Suspense fallback={null}>
            <Scene
              controls={controls}
              reduceMotion={reduceMotion}
              enteredRef={enteredRef.current}
              liveRef={liveRef.current}
              panelOpenRef={panelOpenRef.current}
              focusedIdRef={focusedIdRef.current}
              inviteUntilRef={inviteUntilRef.current}
              listeningRef={listeningRef.current}
              onOpen={open}
              onIntroComplete={handleIntroComplete}
              debug={debug}
              lightsOn={lightsOn}
              onToggleLights={toggleLights}
              activeId={active}
              focusedId={focusedId}
              crtArmed={crtArmed}
              crtSrc={crtSrc}
              gyroRef={gyroRef}
            />
          </Suspense>
        </Canvas>
      </div>

      <FilmFX reduceMotion={reduceMotion} />
      <CustomCursor active={entered} />
      <MuteControl visible={entered} faded={videoFocused} />
      <GyroButton visible={canLook} gyroRef={gyroRef} />
      <TopNav visible={canLook} activeId={active} onOpen={open} />
      <DragHint active={canLook} controls={controls} reduceMotion={reduceMotion} />
      <WonderToast active={canLook} />

      <SectionPanel
        activeId={active}
        onClose={close}
        onPlayCrt={playCrt}
        crtSrc={crtSrc}
        crtArmed={crtArmed}
        reduceMotion={reduceMotion}
      />
      <LoadingGate onEntered={handleEntered} />
    </div>
  );
}
