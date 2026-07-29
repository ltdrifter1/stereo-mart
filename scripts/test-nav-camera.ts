/**
 * Camera / viewport / navigation interaction checks.
 * Run: npx tsx scripts/test-nav-camera.ts
 */
import assert from 'node:assert/strict';
import gsap from 'gsap';

import {
  DESIGN_ASPECT,
  adaptMfovToViewport,
  createControls,
  createNavState,
  createNavigationController,
  easeInOutQuart,
  frontLookTarget,
  horizontalFovToMfov,
  resolveExploreMfov,
  resolveLookMfov,
  resolveLookTarget,
  yawDelta,
} from '../lib/navigation';
import { MFOV_EXPLORE, mfovToHorizontalFov, uToYaw, uvToSpherical, vToPitch } from '../lib/pano';
import {
  HASH_BY_SECTION_ID,
  NAV_ORDER,
  SECTION_BY_ID,
  SECTION_ID_BY_HASH,
} from '../app/data/sections';
import { GLOW } from '../lib/glow';

const phone = {
  width: 390,
  height: 844,
  aspect: 390 / 844,
  dpr: 3,
  offsetTop: 0,
  offsetLeft: 0,
  safeTop: 47,
  safeRight: 0,
  safeBottom: 34,
  safeLeft: 0,
  safeMarginX: 0.08,
  safeMarginY: 0.18,
};

const desktop = {
  width: 1440,
  height: 900,
  aspect: 1440 / 900,
  dpr: 2,
  offsetTop: 0,
  offsetLeft: 0,
  safeTop: 0,
  safeRight: 0,
  safeBottom: 0,
  safeLeft: 0,
  safeMarginX: 0.1,
  safeMarginY: 0.12,
};

// 1) Aspect adapt preserves design HFOV
{
  const design = 20;
  const adaptedPhone = adaptMfovToViewport(design, phone.aspect);
  const phoneHfov = mfovToHorizontalFov(adaptedPhone, phone.aspect);
  const designHfov = mfovToHorizontalFov(design, DESIGN_ASPECT);
  assert.ok(
    Math.abs(phoneHfov - designHfov) < 0.5,
    `phone HFOV ${phoneHfov} should ≈ design ${designHfov}`,
  );
  assert.ok(
    adaptedPhone > design + 10,
    `phone MFOV ${adaptedPhone} must be wider than raw ${design} (was over-zooming)`,
  );
  console.log('✓ adaptMfovToViewport preserves HFOV; phone no longer over-zooms');
}

// 1b) Explore FOV adapts on portrait so the room doesn’t tunnel
{
  const desk = resolveExploreMfov(desktop);
  const mob = resolveExploreMfov(phone);
  assert.equal(desk, MFOV_EXPLORE, 'desktop explore stays at authored MFOV');
  assert.ok(mob > desk + 10, `phone explore ${mob} must widen past desktop ${desk}`);
  const deskHfov = mfovToHorizontalFov(desk, desktop.aspect);
  const mobHfov = mfovToHorizontalFov(mob, phone.aspect);
  assert.ok(
    Math.abs(mobHfov - deskHfov) < 12,
    `phone HFOV ${mobHfov.toFixed(1)} should approach desktop ${deskHfov.toFixed(1)}`,
  );
  console.log(
    `✓ explore FOV desktop=${desk.toFixed(1)} (H=${deskHfov.toFixed(1)}) phone=${mob.toFixed(1)} (H=${mobHfov.toFixed(1)})`,
  );
}

// 2) CRT framing: mid lookto (not watch punch-in); phone widens further
{
  const crt = SECTION_BY_ID['crt-tv'];
  assert.equal(crt.lookFov, 48, 'CRT lookFov should frame the set, not fov 22 punch-in');
  assert.ok(crt.glowLatches !== false, 'CRT glow should latch while Videos is focused');
  assert.ok(crt.hideHint, 'CRT glow should have no proximity text');
  assert.ok(
    crt.items.some((i) => i.videoSrc),
    'CRT needs at least one in-room channel (videoSrc)',
  );
  assert.ok(
    crt.items.some((i) => i.videoSrc === '/videos/channel_b.mp4'),
    'CRT station identity should be branded channel_b (not color bars)',
  );
  assert.ok(
    !crt.items.some((i) => i.videoSrc === '/videos/crt_loop.mp4' || i.videoSrc === '/videos/channel_a.mp4'),
    'CRT catalog must not ship SMPTE color-bar loops',
  );
  assert.equal(crt.intro.trim(), '', 'Videos intro cleared');
  assert.equal(crt.items.length, 1, 'Videos keeps a single station for now');
  assert.equal(crt.items[0]?.label, 'STEREO-MART-TV');
  assert.equal(crt.items[0]?.videoSrc, '/videos/channel_b.mp4');
  // CRT video plane must sit inside painted glass — not the old 0.7×0.58 overshoot.
  assert.ok(crt.w === 21.7 && crt.h === 16.5, 'CRT hit plane stays v9 tube-set sized');
  const desk = resolveLookMfov(crt, desktop);
  const mob = resolveLookMfov(crt, phone);
  assert.equal(desk, 48, `desktop CRT should stay authored 48, got ${desk}`);
  assert.ok(mob > desk, `mobile CRT mfov ${mob} should be > desktop ${desk}`);
  console.log(`✓ CRT lookto desktop=${desk.toFixed(1)} mobile=${mob.toFixed(1)}`);
}

// 3) Music booth: desktop authored 95 (room view); phone adapted wider; coming soon
{
  const musicSec = SECTION_BY_ID['listening-booth'];
  assert.ok(musicSec.items.length === 2, 'Music booth lists At Home + Inlet Knight');
  assert.equal(musicSec.items[0].label, 'At Home');
  assert.equal(musicSec.items[1].label, 'Inlet Knight');
  assert.ok(
    musicSec.items[1].tracks && musicSec.items[1].tracks.length === 16,
    'Inlet Knight album has full 16-track list',
  );
  assert.ok(musicSec.items[1].previewSrc, 'Inlet Knight has a booth preview snip');
  assert.ok(
    musicSec.items.every((i) => i.previewSrc),
    'every Music release needs a booth preview',
  );
  assert.ok(
    musicSec.items.every(
      (i) =>
        Array.isArray(i.tracks) &&
        i.tracks.length >= 1 &&
        i.tracks.every((t) => t.title && t.duration && !/booth preview/i.test(t.title)),
    ),
    'every Music release needs a real tracklist with durations',
  );
  assert.equal(musicSec.title.trim(), '', 'Music panel title cleared');
  assert.ok(musicSec.hideHint, 'Music glow must not show Slip on headphones text');
  assert.equal(musicSec.intro.trim(), '', 'Music panel intro cleared (no slip on headphones)');
  assert.ok(
    musicSec.items.every((i) => Array.isArray(i.tracks) && i.tracks.length >= 1),
    'Music shelf rows expose a track count',
  );
  assert.ok(
    musicSec.items.every((i) => !i.body),
    'Music level-1 stays basic — no shelf blurbs',
  );
  const music = { w: 6, h: 9, lookFov: musicSec.lookFov };
  const desk = resolveLookMfov(music, desktop);
  const mob = resolveLookMfov(music, phone);
  assert.equal(desk, musicSec.lookFov);
  assert.ok(mob > musicSec.lookFov, `mobile music mfov ${mob} should widen past ${musicSec.lookFov}`);
  assert.ok(musicSec.w <= 32 && musicSec.h <= 24, 'Music glow hugs headphones/turntable shelf, not whole tower');
  assert.ok(
    Math.abs(musicSec.u - 0.5) < 0.05,
    'Music / LISTEN sits on the far back wall',
  );
  assert.ok((musicSec.walkDolly ?? 0) >= 6, 'Music uses walk approach dolly');
  assert.ok(
    SECTION_BY_ID['record-bins'].w <= 42 && SECTION_BY_ID['record-bins'].h <= 29,
    'Artists glow hugs the bin wood, not the moss rug',
  );
  const shopSec = SECTION_BY_ID['cash-register'];
  assert.ok(shopSec.w <= 12 && shopSec.h <= 11, 'Shop hitbox is the register body, not shelves behind');
  assert.ok(shopSec.h <= 8, 'Shop height stays on the register, not wall shelves');
  assert.ok(
    Math.abs((shopSec.lookU ?? shopSec.u) - shopSec.u) < 0.01,
    'Shop lookto aims at the register, not the shelf wall',
  );
  assert.ok(
    Math.abs(shopSec.u - 0.223) < 0.02 && Math.abs(shopSec.v - 0.45) < 0.02,
    'Shop centers on the cream cash register',
  );
  const musicTarget = resolveLookTarget(musicSec, desktop);
  assert.ok(
    musicTarget.eye && Math.hypot(musicTarget.eye.x, musicTarget.eye.y, musicTarget.eye.z) > 4,
    'Music lookto moves the eye toward the tower',
  );
  console.log(`✓ music lookto desktop=${desk.toFixed(1)} mobile=${mob.toFixed(1)}`);
}

// 4) horizontalFovToMfov inverse
{
  for (const aspect of [16 / 9, 4 / 3, 390 / 844, 1]) {
    const mfov = 90;
    const h = mfovToHorizontalFov(mfov, aspect);
    const back = horizontalFovToMfov(h, aspect);
    assert.ok(Math.abs(back - mfov) < 0.25, `inverse fail aspect=${aspect}: ${back} vs ${mfov}`);
  }
  console.log('✓ horizontalFovToMfov ↔ mfovToHorizontalFov');
}

// 5) yaw shortest path + easing bounds
{
  assert.ok(Math.abs(yawDelta(0, Math.PI * 0.5) - Math.PI * 0.5) < 1e-9);
  assert.ok(yawDelta(0.1, -0.1) < 0);
  assert.equal(easeInOutQuart(0), 0);
  assert.equal(easeInOutQuart(1), 1);
  assert.ok(easeInOutQuart(0.5) > 0.4 && easeInOutQuart(0.5) < 0.6);
  console.log('✓ yawDelta + easeInOutQuart');
}

// 6) Soft close keeps camera pose (BT BACK) — no front snap
{
  const controls = createControls({
    lookTarget: { x: 0.4, y: -0.1 },
    mfov: 45,
    userControl: true,
    followFactor: 0,
  });
  const navState = createNavState();
  let active: string | null = 'listening-booth';
  let focused: string | null = 'listening-booth';
  navState.activeId = 'listening-booth';
  navState.focusedId = 'listening-booth';
  navState.panelOpen = true;

  const nav = createNavigationController(controls, navState, {
    onActiveChange: (id) => {
      active = id;
    },
    onFocusedChange: (id) => {
      focused = id;
    },
    reduceMotion: true,
  });
  nav.setLookEnabled(true);

  const yawBefore = controls.lookTarget.x;
  const pitchBefore = controls.lookTarget.y;
  nav.close({ force: true, silent: true });

  assert.equal(active, null);
  assert.equal(focused, null);
  assert.equal(navState.panelOpen, false);
  assert.equal(controls.lookTarget.x, yawBefore, 'soft close must keep yaw');
  assert.equal(controls.lookTarget.y, pitchBefore, 'soft close must keep pitch');
  assert.ok(
    controls.mfov >= MFOV_EXPLORE - 0.5,
    `soft close should restore explore FOV, got ${controls.mfov}`,
  );
  console.log('✓ soft close clears HUD and restores explore FOV');
}

// 7) CRT resetToFront snaps to explore front (BT video drag)
{
  const controls = createControls({
    lookTarget: { x: 0.9, y: 0.2 },
    mfov: 28,
    userControl: true,
  });
  const navState = createNavState();
  navState.activeId = 'crt-tv';
  navState.focusedId = 'crt-tv';
  navState.panelOpen = true;

  const nav = createNavigationController(controls, navState, {
    onActiveChange: () => {},
    onFocusedChange: () => {},
    reduceMotion: true,
  });
  nav.setLookEnabled(true);
  nav.resetToFront({ silent: true });

  const front = frontLookTarget(desktop);
  assert.equal(navState.focusedId, null);
  assert.ok(Math.abs(controls.lookTarget.x - front.yaw) < 1e-9);
  assert.ok(Math.abs(controls.lookTarget.y - front.pitch) < 1e-9);
  assert.ok(Math.abs(controls.mfov - front.mfov) < 0.5);
  console.log('✓ resetToFront restores explore front framing');
}

// 8) reframeFocused only changes MFOV
{
  const controls = createControls({
    lookTarget: { x: 0.33, y: 0.05 },
    mfov: 20,
    userControl: true,
  });
  const navState = createNavState();
  navState.activeId = 'crt-tv';
  navState.focusedId = 'crt-tv';
  navState.panelOpen = true;

  const nav = createNavigationController(controls, navState, {
    onActiveChange: () => {},
    onFocusedChange: () => {},
    reduceMotion: true,
  });
  nav.setLookEnabled(true);

  const yawBefore = controls.lookTarget.x;
  const pitchBefore = controls.lookTarget.y;
  nav.reframeFocused(phone);
  assert.equal(controls.lookTarget.x, yawBefore);
  assert.equal(controls.lookTarget.y, pitchBefore);
  assert.ok(controls.mfov > 20, `reframe should widen CRT mfov on phone, got ${controls.mfov}`);
  console.log(`✓ reframeFocused adapts mfov→${controls.mfov.toFixed(1)} without re-aiming`);
}

// 10) Shop / cash-register opens in-room panel (no eject)
{
  const controls = createControls({
    lookTarget: { x: 0, y: 0 },
    mfov: MFOV_EXPLORE,
    userControl: true,
  });
  const navState = createNavState();
  let active: string | null = null;
  let focused: string | null = null;
  const nav = createNavigationController(controls, navState, {
    onActiveChange: (id) => {
      active = id;
    },
    onFocusedChange: (id) => {
      focused = id;
    },
    reduceMotion: true,
  });
  nav.setLookEnabled(true);
  nav.open('cash-register', desktop);
  assert.equal(active, 'cash-register');
  assert.equal(focused, 'cash-register');
  assert.equal(navState.panelOpen, true);
  assert.ok(controls.mfov < MFOV_EXPLORE, 'shop lookto should punch in from explore FOV');
  const shop = SECTION_BY_ID['cash-register'];
  assert.equal(shop.title.trim(), '', 'Shop title cleared (no The Counter)');
  assert.equal(shop.intro.trim(), '', 'Shop intro cleared for compact New Releases');
  assert.equal(shop.kicker, 'New Releases', 'Shop panel kicker is New Releases');
  assert.equal(shop.items.length, 2, 'Shop lists Inlet Knight album + At Home');
  assert.match(shop.items[0].label, /Inlet Knight/i);
  assert.ok(!shop.items[0].meta, 'self-titled Inlet Knight omits duplicate artist meta');
  assert.equal(shop.items[1].label, 'At Home');
  assert.equal(shop.items[1].meta, 'Inlet Knight');
  assert.ok(shop.items[0].tracks && shop.items[0].tracks.length >= 16);
  assert.ok(
    shop.items.every((i) => i.label && i.href),
    'Shop rows need album title and buy link',
  );
  assert.ok(
    shop.items.every((i) => i.listenOn?.length === 1 && i.listenOn[0].label === 'Buy Now'),
    'Shop nest CTAs are Buy Now only',
  );
  assert.ok(
    shop.items.every((i) => !i.body && !i.detail),
    'Shop level-1 stays basic — no blurbs or detail lines',
  );
  assert.ok(
    !shop.items.some((i) => i.listenOn?.some((l) => l.href === '#preview')),
    'Shop must not ship dead #preview links',
  );
  assert.ok(
    shop.items[1].tracks &&
      shop.items[1].tracks.length === 3 &&
      shop.items[1].tracks.every((t) => t.duration),
    'At Home shop row needs the 3-track list with durations',
  );
  console.log('✓ cash-register opens in-room shop panel');
}

// 10a) From free look, glow latches immediately and panel stages mid-lookto
{
  // Node has no rAF — AnimationManager needs a stub for the lookto tween.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id)) as typeof cancelAnimationFrame;

  const controls = createControls({
    lookTarget: { x: 0, y: 0 },
    mfov: MFOV_EXPLORE,
    userControl: true,
  });
  const navState = createNavState();
  let active: string | null = null;
  let focused: string | null = null;
  const nav = createNavigationController(controls, navState, {
    onActiveChange: (id) => {
      active = id;
    },
    onFocusedChange: (id) => {
      focused = id;
    },
    reduceMotion: false,
  });
  nav.setLookEnabled(true);
  nav.open('listening-booth', desktop);
  assert.equal(focused, 'listening-booth', 'glow/focus should latch immediately');
  assert.equal(active, null, 'panel should wait for mid-lookto reveal');
  assert.equal(navState.panelOpen, false);

  // Force GSAP delayedCall (~0.72s) to fire.
  gsap.updateRoot(2);
  assert.equal(active, 'listening-booth', 'panel should open after reveal delay');
  assert.equal(navState.panelOpen, true);
  console.log('✓ panel HUD stages mid-lookto from free look');

  // Tear down lookto tween before restoring Node globals.
  nav.close({ force: true, silent: true });
  gsap.killTweensOf(controls);
  gsap.ticker.sleep();
  globalThis.requestAnimationFrame = prevRaf;
  globalThis.cancelAnimationFrame = prevCaf;
}

// 10b) Artists roster — Inlet Knight only
{
  const artists = SECTION_BY_ID['record-bins'];
  assert.equal(artists.items.length, 1, 'Artists panel lists Inlet Knight only');
  assert.ok(
    /Inlet Knight/i.test(artists.items[0]?.label ?? ''),
    'roster is Inlet Knight',
  );
  assert.ok(
    !artists.items.some((i) => /Charlie Archer|Drifta/i.test(i.label)),
    'roster excludes Charlie Archer and L.T. Drifta',
  );
  console.log('✓ Artists roster');
}

// 11) Hash map covers every nav section; Archive/Lore gone; no glow hint text
{
  assert.ok(
    !(NAV_ORDER as readonly string[]).includes('back-room-door'),
    'Lore must be removed from conveyor',
  );
  assert.ok(
    !(NAV_ORDER as readonly string[]).includes('flyer-wall'),
    'Archive must be removed from conveyor',
  );
  assert.ok(!('flyer-wall' in SECTION_BY_ID), 'Archive section must be deleted');
  assert.ok(!('back-room-door' in SECTION_BY_ID), 'Lore section must be deleted');
  for (const id of NAV_ORDER) {
    const hash = HASH_BY_SECTION_ID[id];
    assert.ok(hash, `missing hash for ${id}`);
    assert.equal(SECTION_ID_BY_HASH[hash], id);
    assert.ok(SECTION_BY_ID[id], `missing section ${id}`);
    assert.ok(SECTION_BY_ID[id].goldEdge, `${id} needs gold-edge glow`);
    assert.ok(SECTION_BY_ID[id].hideHint, `${id} must not show glow label text`);
    assert.equal(SECTION_BY_ID[id].hint.trim(), '', `${id} hint text must be empty`);
  }
  const phone = SECTION_BY_ID['phone-booth'];
  assert.equal(phone.title.trim(), '', 'Contact title should be empty (kicker only)');
  assert.equal(phone.intro.trim(), '', 'Contact intro cleared');
  assert.equal(phone.kicker, 'Contact', 'Contact keeps a compact kicker label');
  assert.equal(phone.items.length, 2, 'Contact is Charlie + Instagram only');
  assert.ok(
    phone.items.every((it) => !/info@|Booking/i.test(`${it.label}${it.meta ?? ''}`)),
    'Contact must not include info@ or Booking',
  );
  assert.ok(
    phone.items.some((it) => /charlie/i.test(`${it.label}${it.meta ?? ''}`)),
    'Contact must include Charlie',
  );
  console.log('✓ Nav hash map + Archive removed + edge glows without labels');
}

// 9) Equirect yaw phase — looking at authored u must sample file_u ≈ 1−u
//    (and hotspot must sit on the same ray). Regression for Music→poster-wall bug.
{
  const cameraForward = (yaw: number, pitch: number) => {
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    return { x: -sy * cp, y: sp, z: -cy * cp };
  };

  const sphereGeomU = (P: { x: number; y: number; z: number }) => {
    const r = Math.hypot(P.x, P.y, P.z);
    const x = P.x / r;
    const y = P.y / r;
    const z = P.z / r;
    const theta = Math.acos(Math.max(-1, Math.min(1, y)));
    const st = Math.sin(theta) || 1e-9;
    let phi = Math.atan2(z / st, -x / st);
    if (phi < 0) phi += Math.PI * 2;
    return phi / (Math.PI * 2);
  };

  const fileUFromDir = (P: { x: number; y: number; z: number }) => {
    // texture.repeat.x = -1, offset.x = 1 → file_u = 1 − geomU
    const geomU = sphereGeomU(P);
    return ((1 - geomU) % 1 + 1) % 1;
  };

  const check = (label: string, u: number, v: number) => {
    const yaw = uToYaw(u);
    const pitch = vToPitch(v);
    const fwd = cameraForward(yaw, pitch);
    const [hx, hy, hz] = uvToSpherical(u, v, 1);
    const hot = { x: hx, y: hy, z: hz };
    const fileCam = fileUFromDir(fwd);
    const fileHot = fileUFromDir(hot);
    const want = ((1 - u) % 1 + 1) % 1;
    const dot = fwd.x * hot.x + fwd.y * hot.y + fwd.z * hot.z;
    assert.ok(
      Math.abs(fileCam - want) < 0.02,
      `${label}: camera file ${fileCam} should ≈ 1−u=${want}`,
    );
    assert.ok(
      Math.abs(fileHot - want) < 0.02,
      `${label}: hotspot file ${fileHot} should ≈ 1−u=${want}`,
    );
    assert.ok(dot > 0.99, `${label}: hotspot must lie on camera forward (dot=${dot})`);
  };

  check('Music lookto', 0.18, 0.42);
  check('Music hit', 0.2, 0.4);
  check('Videos lookto', 0.3, 0.415);
  check('Videos hit', 0.3, 0.42);
  check('Phone', 0.486, 0.406);
  check('Register', 0.573, 0.53);
  console.log('✓ lookto/hotspot yaw phase: file_u ≈ 1−authored_u (Music≠poster wall)');
}

// 13) Idle glow floor stays alive after settle (phone discoverability)
{
  assert.ok(GLOW.idleBase >= 0.18, 'idle glow floor must stay visible without hover');
  assert.ok(GLOW.idleBase < GLOW.settleBoost, 'settle boost should read louder than idle');
  assert.ok(GLOW.idlePanelMul > 0 && GLOW.idlePanelMul < 0.35, 'panel should dim — not kill — other glows');
  assert.ok(GLOW.idleBreathSpeed < GLOW.breathSpeed, 'idle breath should be calmer than hover');
  assert.ok(
    GLOW.listeningBreathSpeed > GLOW.breathSpeed,
    'listening booth pulse should read faster than hover',
  );
  console.log('✓ idle hotspot glow policy');
}

console.log('\nAll nav camera checks passed.');
