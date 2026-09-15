import {
  ABOUT_ITEMS,
  ART,
  ARTISTS,
  CRT_CHANNELS,
  MUSIC_RELEASES,
  SHOP_ITEMS,
  type SectionItem,
} from './catalog';
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
} from '@/lib/brand';
import { athAtvToUv } from '@/lib/pano';

/**
 * Content (releases, CRT channels, artists, shop rows) lives in ./catalog.ts —
 * edit that file to add or change what the store plays and sells.
 */
export type { ListenLink, SectionItem, TrackItem } from './catalog';

export type Section = {
  /** stable id / route slug */
  id: string;
  /** the object in the scene that holds this hotspot */
  object: string;
  /** the destination the hotspot maps to */
  nav: string;
  /** short label shown on hover */
  hint: string;
  /** panel heading */
  title: string;
  /** panel sub heading */
  kicker: string;
  /** intro copy, written to feel like stepping into a hidden room */
  intro: string;
  /** accent colour used across the hotspot + panel */
  accent: string;
  /**
   * Normalised hotspot position on the equirectangular store
   * (public/textures/store_pano_v7.webp, 4096×2048).
   * u: around full 360° yaw after BackSide U-flip (1 − texture_u) · v: top→bottom
   */
  u: number;
  v: number;
  /** Optional lookto aim point (defaults to hotspot u/v). */
  lookU?: number;
  lookV?: number;
  /** hotspot footprint in world units on the sphere wall */
  w: number;
  h: number;
  /**
   * Optional glow/edge-mask plane size when it must differ from the hit
   * footprint (CRT: w/h are tube-locked for the video overlay, the glow
   * covers the whole painted set).
   */
  glowW?: number;
  glowH?: number;
  /**
   * MFOV used by lookto when focusing this feature
   * (Music ~95 room view; Videos framed mid — not watch punch-in).
   */
  lookFov: number;
  /**
   * Optional walk approach — world units from sphere center toward the
   * feature along the look ray. 0 = classic pivot-in-place. Typical 5–10.
   */
  walkDolly?: number;
  /** Object SFX key played on focus (see lib/audio.ts). */
  sfx: string;
  /**
   * When false, glow is hover-only (no focusedId latch). CRT / shop use this.
   * Default true — glow stays while the section is focused (lookto/panel).
   */
  glowLatches?: boolean;
  /** Flip glow map on X (plane UV vs BackSide wall parity). */
  glowFlipX?: boolean;
  /**
   * balmingtiger-style outer-edge glow: loads `*_edge.webp` silhouette rim
   * (not a filled glow slab). When false, falls back to `*_glow.webp`.
   */
  goldEdge?: boolean;
  /** Hide proximity / hover Html label over the hotspot glow. */
  hideHint?: boolean;
  /** list rendered inside the panel */
  items: SectionItem[];
};

/**
 * Discoverable hotspots around the 360° store.
 * Tuned against the v20 illustrated shop plate (see v20/NAVIGATION.md).
 * ath/atv → authored UV: u = 1 − (ath+180)/360, v = (atv+90)/180
 * (BackSide U-flip convention in lib/pano.ts).
 * Append ?debug=1 to tint hit areas while tuning (u,v).
 */
const listenUv = athAtvToUv(-88, -6);
const listenLook = athAtvToUv(-88, -10);
const crtUv = athAtvToUv(-78, 22);
const crtLook = athAtvToUv(-78, 14);
const posterUv = athAtvToUv(-175, -25);
const posterLook = athAtvToUv(-175, -18);
const crateUv = athAtvToUv(172, 5);
const crateLook = athAtvToUv(172, 0);
const mailUv = athAtvToUv(43, 13);
const deskUv = athAtvToUv(95, 15);
const deskLook = athAtvToUv(95, 8);

export const SECTIONS: Section[] = [
  {
    id: 'listening-booth',
    object: 'Listening Station',
    nav: 'Music',
    hint: '',
    title: '',
    kicker: 'Music',
    intro: '',
    accent: '#7d93a6',
    // v20: LISTEN HERE headphones + turntable (ath -88, atv -6)
    u: listenUv.u,
    v: listenUv.v,
    lookU: listenLook.u,
    lookV: listenLook.v,
    w: 16,
    h: 18,
    glowW: 16,
    glowH: 18,
    lookFov: 50,
    walkDolly: 6,
    sfx: 'music',
    goldEdge: true,
    hideHint: true,
    items: MUSIC_RELEASES,
  },
  {
    id: 'crt-tv',
    object: 'CRT Television',
    nav: 'Videos',
    hint: '',
    title: '',
    kicker: 'Videos',
    intro: '',
    accent: '#7d93a6',
    // v20: CRT on the red milk crate (ath -78, atv 22)
    u: crtUv.u,
    v: crtUv.v,
    lookU: crtLook.u,
    lookV: crtLook.v,
    w: 10,
    h: 9,
    glowW: 12,
    glowH: 11,
    lookFov: 50,
    walkDolly: 8,
    sfx: 'video',
    glowLatches: true,
    goldEdge: true,
    hideHint: true,
    items: CRT_CHANNELS,
  },
  {
    id: 'record-bins',
    object: 'Poster Wall',
    nav: 'Artists',
    hint: '',
    title: '',
    kicker: 'Artists',
    intro: '',
    accent: '#c97f4e',
    // v20: poster wall above the bins (ath -175, atv -25)
    u: posterUv.u,
    v: posterUv.v,
    lookU: posterLook.u,
    lookV: posterLook.v,
    w: 22,
    h: 16,
    glowW: 22,
    glowH: 16,
    lookFov: 60,
    walkDolly: 4,
    sfx: 'artists',
    goldEdge: true,
    hideHint: true,
    items: ARTISTS,
  },
  {
    id: 'cash-register',
    object: 'Record Crates',
    nav: 'Shop',
    hint: '',
    title: '',
    kicker: 'New Releases',
    intro: '',
    accent: '#6f7d5a',
    // v20: NEW ARRIVALS crates (ath 172, atv 5)
    u: crateUv.u,
    v: crateUv.v,
    lookU: crateLook.u,
    lookV: crateLook.v,
    w: 22,
    h: 16,
    lookFov: 55,
    walkDolly: 4,
    sfx: 'shop',
    goldEdge: true,
    hideHint: true,
    items: SHOP_ITEMS,
  },
  {
    id: 'desk',
    object: 'Desk',
    nav: 'About',
    hint: '',
    title: '',
    kicker: 'About',
    intro: '',
    accent: '#e0b64f',
    // v20: desk buried in demo tapes (ath 95, atv 15)
    u: deskUv.u,
    v: deskUv.v,
    lookU: deskLook.u,
    lookV: deskLook.v,
    w: 14,
    h: 11,
    lookFov: 60,
    walkDolly: 6,
    sfx: 'focus',
    goldEdge: true,
    hideHint: true,
    items: ABOUT_ITEMS,
  },
  {
    id: 'phone-booth',
    object: 'Mail Slot',
    nav: 'Contact',
    hint: '',
    title: '',
    kicker: 'Contact',
    intro: '',
    accent: '#9aabb8',
    // v20: mail slot on the door lower panel (ath 43, atv 13)
    u: mailUv.u,
    v: mailUv.v,
    lookU: mailUv.u,
    lookV: mailUv.v,
    w: 8,
    h: 6,
    lookFov: 45,
    walkDolly: 7,
    sfx: 'phone',
    goldEdge: true,
    hideHint: true,
    items: [
      {
        label: 'Charlie',
        meta: CONTACT_EMAIL,
        detail: 'Email',
        cta: 'Email',
        thumb: 'CH',
        thumbSrc: ART.charlie,
        href: CONTACT_MAILTO,
      },
      {
        label: INSTAGRAM_HANDLE,
        meta: 'Instagram',
        detail: 'Follow',
        cta: 'Follow',
        thumb: '@',
        thumbSrc: ART.ig,
        href: INSTAGRAM_URL,
      },
    ],
  },
];

export const SECTION_BY_ID = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
) as Record<string, Section>;

/**
 * Legacy static catalog URL — now a thin brand bridge into the 360 room.
 * Prefer deep links like `/#shop` for in-app navigation.
 */
export const SHOP_URL = '/shop';

/** Primary conveyor nav order. */
export const NAV_ORDER = [
  'listening-booth',
  'crt-tv',
  'record-bins',
  'cash-register',
  'phone-booth',
] as const;

/**
 * URL hash slugs ↔ section ids (shareable deep links).
 * Example: https://www.stereo-mart.com/#shop
 */
export const HASH_BY_SECTION_ID: Record<string, string> = {
  'listening-booth': 'music',
  'crt-tv': 'videos',
  'record-bins': 'artists',
  'cash-register': 'shop',
  'phone-booth': 'contact',
};

export const SECTION_ID_BY_HASH: Record<string, string> = Object.fromEntries(
  Object.entries(HASH_BY_SECTION_ID).map(([id, hash]) => [hash, id]),
);
