/**
 * In-world objects — source of truth is v20/NAVIGATION.md (ath/atv).
 * Each painted object lookto-glides then opens a catalog panel.
 * Conveyor / hash still use section ids; extra spots are room-only.
 */
import { athAtvToUv } from '@/lib/pano';
import { SECTION_BY_ID, type Section } from './sections';

export type RoomHotspot = {
  id: string;
  /** Panel this object opens (`SECTIONS` id). */
  opens: string;
  object: string;
  /** krpano ath/atv as authored in v20/NAVIGATION.md */
  ath: number;
  atv: number;
  u: number;
  v: number;
  lookU?: number;
  lookV?: number;
  w: number;
  h: number;
  glowW?: number;
  glowH?: number;
  lookFov: number;
  walkDolly?: number;
  sfx: string;
  glowLatches?: boolean;
  goldEdge?: boolean;
  hideHint?: boolean;
  glowFlipX?: boolean;
  /** Glow silhouette under /public/hotspots */
  glowSrc: string;
  /** Visible overlay prop (mail slot) — painted plate has none. */
  overlaySrc?: string;
  overlayW?: number;
  overlayH?: number;
};

function spot(
  partial: Omit<RoomHotspot, 'u' | 'v'> & { lookAtv?: number },
): RoomHotspot {
  const { u, v } = athAtvToUv(partial.ath, partial.atv);
  const look = partial.lookAtv != null ? athAtvToUv(partial.ath, partial.lookAtv) : null;
  return {
    ...partial,
    u,
    v,
    lookU: look?.u ?? u,
    lookV: look?.v ?? v,
    goldEdge: partial.goldEdge ?? true,
    hideHint: partial.hideHint ?? true,
  };
}

/**
 * Primary painted objects + extras (door, cassette rack, desk).
 * Ids that match a section are the canonical lookto for that panel/hash.
 */
export const ROOM_HOTSPOTS: RoomHotspot[] = [
  spot({
    id: 'listening-booth',
    opens: 'listening-booth',
    object: 'Listening Station',
    ath: -88,
    atv: -6,
    lookAtv: -10,
    w: 16,
    h: 18,
    glowW: 16,
    glowH: 18,
    lookFov: 50,
    walkDolly: 6,
    sfx: 'music',
    glowSrc: '/hotspots/listening-booth_glow.png',
  }),
  spot({
    id: 'crt-tv',
    opens: 'crt-tv',
    object: 'CRT Television',
    ath: -78,
    atv: 22,
    lookAtv: 14,
    w: 10,
    h: 9,
    glowW: 12,
    glowH: 11,
    lookFov: 50,
    walkDolly: 8,
    sfx: 'video',
    glowLatches: true,
    glowSrc: '/hotspots/crt-tv_glow.png',
  }),
  spot({
    id: 'record-bins',
    opens: 'record-bins',
    object: 'Poster Wall',
    ath: -175,
    atv: -25,
    lookAtv: -18,
    w: 22,
    h: 16,
    glowW: 22,
    glowH: 16,
    lookFov: 60,
    walkDolly: 4,
    sfx: 'artists',
    glowSrc: '/hotspots/record-bins_glow.png',
  }),
  spot({
    id: 'cash-register',
    opens: 'cash-register',
    object: 'Record Crates',
    ath: 172,
    atv: 5,
    lookAtv: 0,
    w: 22,
    h: 16,
    glowW: 22,
    glowH: 16,
    lookFov: 55,
    walkDolly: 4,
    sfx: 'shop',
    glowSrc: '/hotspots/cash-register_glow.png',
  }),
  spot({
    id: 'cassette-rack',
    opens: 'cash-register',
    object: 'Cassette Rack',
    ath: 138,
    atv: -12,
    lookAtv: -8,
    w: 13,
    h: 20,
    glowW: 13,
    glowH: 20,
    lookFov: 50,
    walkDolly: 5,
    sfx: 'shop',
    glowSrc: '/hotspots/cassette-rack_glow.png',
  }),
  spot({
    id: 'front-door',
    opens: 'cash-register',
    object: 'Glass Door',
    ath: 44,
    atv: -3,
    w: 12,
    h: 18,
    lookFov: 60,
    walkDolly: 6,
    sfx: 'door',
    glowSrc: '/hotspots/front-door_glow.png',
  }),
  spot({
    id: 'desk',
    opens: 'desk',
    object: 'Desk',
    ath: 95,
    atv: 15,
    lookAtv: 8,
    w: 14,
    h: 11,
    glowW: 16,
    glowH: 13,
    lookFov: 60,
    walkDolly: 6,
    sfx: 'focus',
    glowSrc: '/hotspots/desk_glow.png',
  }),
  spot({
    id: 'phone-booth',
    opens: 'phone-booth',
    object: 'Mail Slot',
    ath: 43,
    atv: 13,
    w: 8,
    h: 6,
    lookFov: 45,
    walkDolly: 7,
    sfx: 'phone',
    glowSrc: '/hotspots/phone-booth_glow.png',
    overlaySrc: '/hotspots/mailslot.png',
    overlayW: 5.2,
    overlayH: 2.4,
  }),
];

export const HOTSPOT_BY_ID = Object.fromEntries(
  ROOM_HOTSPOTS.map((h) => [h.id, h]),
) as Record<string, RoomHotspot>;

/** Hidden finds — cat / ghost / stickers / mushroom (v20/NAVIGATION.md). */
export type LifeHit = {
  id: string;
  kind: 'find' | 'steam' | 'lamp';
  ath: number;
  atv: number;
  u: number;
  v: number;
  w: number;
  h: number;
  sfx: string;
  src?: string;
  label?: string;
};

function life(
  partial: Omit<LifeHit, 'u' | 'v'>,
): LifeHit {
  const { u, v } = athAtvToUv(partial.ath, partial.atv);
  return { ...partial, u, v };
}

export const LIFE_HITS: LifeHit[] = [
  life({
    id: 'cat',
    kind: 'find',
    ath: -163,
    atv: 24,
    w: 14,
    h: 9,
    sfx: 'cushion',
    label: 'the shop cat (she stretched!)',
  }),
  life({
    id: 'ghost',
    kind: 'find',
    ath: 109,
    atv: -5,
    w: 4,
    h: 6,
    sfx: 'wonder',
    src: '/hotspots/life/ghost.png',
    label: 'the storage room ghost',
  }),
  life({
    id: 'rabbit',
    kind: 'find',
    ath: -114,
    atv: 20,
    w: 2.4,
    h: 2.4,
    sfx: 'poster',
    src: '/hotspots/life/rabbit.png',
    label: 'the rabbit sticker',
  }),
  life({
    id: 'turtle',
    kind: 'find',
    ath: -146,
    atv: 19,
    w: 2.8,
    h: 2.4,
    sfx: 'crate',
    src: '/hotspots/life/turtle.png',
    label: 'the turtle sticker',
  }),
  life({
    id: 'mushroom',
    kind: 'find',
    ath: -53,
    atv: 15,
    w: 2.2,
    h: 2.2,
    sfx: 'owl',
    src: '/hotspots/life/mushroom.png',
    label: 'a tiny mushroom',
  }),
  life({
    id: 'steam',
    kind: 'steam',
    ath: 92,
    atv: 12,
    w: 2.4,
    h: 3.6,
    sfx: 'stool',
    src: '/hotspots/life/steam.png',
  }),
];

export const LAMP_ATH = 88;
export const LAMP_ATV = 5;
export const LAMP_UV = athAtvToUv(LAMP_ATH, LAMP_ATV);

export type Lookable = Pick<
  Section,
  'u' | 'v' | 'lookU' | 'lookV' | 'w' | 'h' | 'lookFov' | 'walkDolly'
>;

export type OpenTarget = {
  section: Section;
  look: Lookable;
  hotspotId: string;
};

/** Resolve a hotspot id or section id to lookto + panel. */
export function resolveOpenTarget(id: string): OpenTarget | null {
  const hotspot = HOTSPOT_BY_ID[id];
  if (hotspot) {
    const section = SECTION_BY_ID[hotspot.opens];
    if (!section) return null;
    return { section, look: hotspot, hotspotId: hotspot.id };
  }
  const section = SECTION_BY_ID[id];
  if (!section) return null;
  const canonical = HOTSPOT_BY_ID[id] ?? ROOM_HOTSPOTS.find((h) => h.opens === id);
  return {
    section,
    look: canonical ?? section,
    hotspotId: canonical?.id ?? id,
  };
}
