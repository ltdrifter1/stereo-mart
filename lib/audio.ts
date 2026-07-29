/**
 * Audio bus — BGM loop + object SFX + balmingtiger-style volume tweens.
 * HTMLAudioElement only (no AudioContext). Unlocks on CLICK TO ENTER.
 *
 * Levels:
 *   bed     → light elevator BGM under the room
 *   panel   → soft duck while a glass HUD is open
 *   preview → near-silence under booth / CRT playback
 */
import gsap from 'gsap';

let bgm: HTMLAudioElement | null = null;
/** Start muted until CLICK TO ENTER (browser gesture), then live like BT. */
let muted = true;
let volTween: gsap.core.Tween | null = null;
let lifecycleBound = false;
/** Why the bed is currently ducked (stack: preview wins over panel). */
let panelDuck = false;
let previewDuck = false;

const volume = {
  /** Comfortable elevator bed — present, never loud. */
  bgm: 0.34,
  sfx: 0.55,
  panel: 0.12,
  preview: 0.02,
  target: 0.34,
};
const listeners = new Set<(muted: boolean) => void>();
/** One reusable element per SFX key — avoids stacking / leaks. */
const sfxPool = new Map<string, HTMLAudioElement>();

/* ---------- in-booth release previews (Listening Booth / Shop) ---------- */
export type PreviewProgress = {
  src: string | null;
  /** True while the element is actively playing (not paused). */
  playing: boolean;
  currentTime: number;
  duration: number;
};

let preview: HTMLAudioElement | null = null;
let previewSrc: string | null = null;
let previewPaused = false;
let previewEndTimer: ReturnType<typeof setTimeout> | null = null;
let previewRaf = 0;
const previewListeners = new Set<(src: string | null) => void>();
const previewProgressListeners = new Set<(p: PreviewProgress) => void>();

const SFX: Record<string, string> = {
  click: '/audio/click.mp3',
  focus: '/audio/focus.mp3',
  music: '/audio/music.mp3',
  video: '/audio/video.mp3',
  phone: '/audio/phone.mp3',
  lights: '/audio/lights.mp3',
  shop: '/audio/shop.mp3',
  archive: '/audio/archive.mp3',
  artists: '/audio/artists.mp3',
  door: '/audio/door.mp3',
  // Unique diegetic toys (balmingtiger cushion / owl / fire / globe class)
  cushion: '/audio/cushion.mp3',
  crate: '/audio/crate.mp3',
  poster: '/audio/poster.mp3',
  stool: '/audio/stool.mp3',
  owl: '/audio/owl.mp3',
  fire: '/audio/fire.mp3',
  wonder: '/audio/wonder.mp3',
};

function ensureBgm() {
  if (bgm) return bgm;
  if (typeof window === 'undefined') return null;
  bgm = new Audio('/audio/bgm.mp3');
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = muted ? 0 : volume.bgm;
  bindAudioLifecycle();
  return bgm;
}

function notify() {
  for (const fn of listeners) fn(muted);
}

function notifyPreview() {
  for (const fn of previewListeners) fn(previewSrc);
}

function readPreviewProgress(): PreviewProgress {
  const a = preview;
  const dur =
    a && isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
  return {
    src: previewSrc,
    playing: Boolean(previewSrc && a && !a.paused && !previewPaused),
    currentTime: a && previewSrc ? a.currentTime : 0,
    duration: dur,
  };
}

function notifyPreviewProgress() {
  const p = readPreviewProgress();
  for (const fn of previewProgressListeners) fn(p);
}

function stopPreviewTicker() {
  if (previewRaf) {
    cancelAnimationFrame(previewRaf);
    previewRaf = 0;
  }
}

function startPreviewTicker() {
  stopPreviewTicker();
  const tick = () => {
    notifyPreviewProgress();
    if (previewSrc && preview && !preview.paused) {
      previewRaf = requestAnimationFrame(tick);
    } else {
      previewRaf = 0;
    }
  };
  previewRaf = requestAnimationFrame(tick);
}

function clearPreviewTimer() {
  if (previewEndTimer) {
    clearTimeout(previewEndTimer);
    previewEndTimer = null;
  }
}

function desiredBedLevel() {
  if (previewDuck) return volume.preview;
  if (panelDuck) return volume.panel;
  return volume.bgm;
}

/**
 * Soft volume ramp — mute, enter, duck, and restore all share this path.
 */
function tweenBgmVolume(to: number, duration = 0.55, ease = 'power1.inOut') {
  const a = ensureBgm();
  if (!a) return;
  volTween?.kill();
  volume.target = to;
  if (duration <= 0 || muted) {
    a.volume = muted ? 0 : to;
    return;
  }
  const proxy = { v: a.volume };
  volTween = gsap.to(proxy, {
    v: to,
    duration,
    ease,
    onUpdate: () => {
      if (!muted && a) a.volume = proxy.v;
    },
  });
}

function applyDuckState(duration = 0.55) {
  if (muted) return;
  tweenBgmVolume(desiredBedLevel(), duration);
}

/** Pause when the tab hides; resume BGM when visible again if unmuted. */
function bindAudioLifecycle() {
  if (lifecycleBound || typeof document === 'undefined') return;
  lifecycleBound = true;

  const onVisibility = () => {
    const a = bgm;
    if (!a) return;
    if (document.hidden) {
      a.pause();
      preview?.pause();
      return;
    }
    if (!muted) {
      a.volume = volume.target;
      void a.play().catch(() => {
        /* user can retry via mute control */
      });
      if (previewSrc && preview) {
        void preview.play()
          .then(() => {
            previewPaused = false;
            startPreviewTicker();
            notifyPreviewProgress();
          })
          .catch(() => stopPreview());
      }
    }
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => {
    bgm?.pause();
    preview?.pause();
  });
}

export function isMuted() {
  return muted;
}

/** Subscribe to mute bus changes (MuteControl sync). */
export function onMuteChange(fn: (muted: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Subscribe to which preview src is currently loaded (null = idle). */
export function onPreviewChange(fn: (src: string | null) => void) {
  previewListeners.add(fn);
  fn(previewSrc);
  return () => {
    previewListeners.delete(fn);
  };
}

/** Subscribe to live preview transport (time / playing). */
export function onPreviewProgress(fn: (p: PreviewProgress) => void) {
  previewProgressListeners.add(fn);
  fn(readPreviewProgress());
  return () => {
    previewProgressListeners.delete(fn);
  };
}

export function getPreviewSrc() {
  return previewSrc;
}

export function getPreviewProgress() {
  return readPreviewProgress();
}

/**
 * balmingtiger muteBGMVolume / unmuteBGMVolume — soft power1.inOut tween.
 * ducked=true → near silence (preview/CRT); false → restore bed/panel level.
 */
export function setBgmDucked(ducked: boolean, duration = 0.6) {
  previewDuck = ducked;
  applyDuckState(duration);
}

/**
 * Light elevator duck while a glass section panel is open.
 * Preview/CRT duck still wins when both are active.
 */
export function setPanelDuck(open: boolean, duration = 0.55) {
  panelDuck = open;
  applyDuckState(duration);
}

/** Stop booth preview and restore BGM level. */
export function stopPreview() {
  clearPreviewTimer();
  stopPreviewTicker();
  previewPaused = false;
  if (preview) {
    try {
      preview.pause();
      preview.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  if (previewSrc) {
    previewSrc = null;
    notifyPreview();
  }
  notifyPreviewProgress();
  setBgmDucked(false, 0.5);
}

/** Pause without clearing — transport Play resumes the same cut. */
export function pausePreview() {
  if (!preview || !previewSrc) return;
  previewPaused = true;
  try {
    preview.pause();
  } catch {
    /* ignore */
  }
  stopPreviewTicker();
  notifyPreviewProgress();
  // Soft unduck toward panel level while paused in the nest.
  setBgmDucked(false, 0.45);
}

/** Seek within the loaded booth preview (seconds). */
export function seekPreview(time: number) {
  if (!preview || !previewSrc) return;
  const dur =
    isFinite(preview.duration) && preview.duration > 0
      ? preview.duration
      : 40;
  preview.currentTime = Math.max(0, Math.min(dur, time));
  notifyPreviewProgress();
}

/**
 * Play a short release preview in the room.
 * Ducks BGM; auto-stops at natural end (clips are ~35s).
 * Same src while playing → pause; same src while paused → resume.
 */
export async function playPreview(src: string) {
  if (typeof window === 'undefined') return false;
  if (!src) return false;

  if (previewSrc === src && preview) {
    if (!preview.paused && !previewPaused) {
      pausePreview();
      return false;
    }
    // Resume
    if (muted) return false;
    previewPaused = false;
    setBgmDucked(true, 0.35);
    try {
      await preview.play();
      startPreviewTicker();
      notifyPreviewProgress();
      return true;
    } catch {
      stopPreview();
      return false;
    }
  }

  stopPreview();
  if (muted) return false;

  if (!preview) {
    preview = new Audio();
    preview.preload = 'auto';
    preview.addEventListener('ended', () => stopPreview());
    preview.addEventListener('loadedmetadata', () => notifyPreviewProgress());
  }

  previewPaused = false;
  previewSrc = src;
  notifyPreview();
  preview.src = src;
  preview.volume = Math.min(0.85, volume.sfx + 0.2);
  setBgmDucked(true, 0.45);
  notifyPreviewProgress();

  try {
    await preview.play();
    startPreviewTicker();
    // Safety cap — even if a long file is wired by mistake.
    clearPreviewTimer();
    previewEndTimer = setTimeout(() => stopPreview(), 40_000);
    notifyPreviewProgress();
    return true;
  } catch {
    stopPreview();
    return false;
  }
}

/**
 * balmingtiger enter: unmute + start BGM on the same user gesture as CLICK TO ENTER.
 * Bed fades in under the intro tilt (not a hard cut).
 * On autoplay failure, leave the bus muted so the UI stays honest.
 */
export async function enterWithAudio() {
  ensureBgm();
  muted = false;
  notify();
  const a = bgm;
  if (!a) return false;
  volTween?.kill();
  panelDuck = false;
  previewDuck = false;
  a.volume = 0;
  volume.target = 0;
  try {
    await a.play();
    tweenBgmVolume(volume.bgm, 1.45, 'power2.out');
    return true;
  } catch {
    muted = true;
    a.volume = 0;
    a.pause();
    notify();
    return false;
  }
}

export async function setMuted(next: boolean) {
  const a = ensureBgm();
  if (!a) {
    muted = next;
    notify();
    return;
  }

  if (next) {
    // Kill preview without restoring the bed — we're fading the whole bus out.
    clearPreviewTimer();
    if (preview) {
      try {
        preview.pause();
        preview.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    if (previewSrc) {
      previewSrc = null;
      notifyPreview();
    }
    previewPaused = false;
    stopPreviewTicker();
    notifyPreviewProgress();
    previewDuck = false;
    volTween?.kill();
    const proxy = { v: a.volume };
    // UI flips immediately; keep writing volume until the fade completes.
    muted = true;
    notify();
    volTween = gsap.to(proxy, {
      v: 0,
      duration: 0.5,
      ease: 'power1.in',
      onUpdate: () => {
        a.volume = proxy.v;
      },
      onComplete: () => {
        a.volume = 0;
        a.pause();
        volume.target = 0;
      },
    });
    return;
  }

  muted = false;
  notify();
  volTween?.kill();
  a.volume = 0;
  volume.target = 0;
  try {
    await a.play();
    tweenBgmVolume(desiredBedLevel(), 0.65, 'power2.out');
  } catch {
    muted = true;
    a.volume = 0;
    notify();
  }
}

export function playSfx(name: keyof typeof SFX | string) {
  if (muted || typeof window === 'undefined') return;
  const src = SFX[name] ?? SFX.focus;
  let s = sfxPool.get(src);
  if (!s) {
    s = new Audio(src);
    s.preload = 'auto';
    sfxPool.set(src, s);
  }
  try {
    s.pause();
    s.currentTime = 0;
    s.volume = volume.sfx;
    void s.play().catch(() => {});
  } catch {
    /* ignore decode / play failures */
  }
}
