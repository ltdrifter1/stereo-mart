import {
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
 * Tuned against the v18 warehouse editorial pano — looktos frame objects
 * with room context; Artists stays an overview (no bin face-plant).
 * Append ?debug=1 to tint hit areas while tuning (u,v).
 */
export const SECTIONS: Section[] = [
  {
    id: 'listening-booth',
    object: 'Listening Booth',
    nav: 'Music',
    hint: '',
    title: '',
    kicker: 'Music',
    intro: '',
    accent: '#8a9baa',
    // v18 warehouse: headphones + turntable on back wall LISTEN nook
    u: 0.5,
    v: 0.4,
    lookU: 0.5,
    lookV: 0.38,
    w: 16,
    h: 18,
    glowW: 16,
    glowH: 18,
    lookFov: 72,
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
    accent: '#6b8a9e',
    // v18 warehouse: CRT on cabinet by night dock windows
    u: 0.91,
    v: 0.55,
    lookU: 0.91,
    lookV: 0.54,
    w: 20,
    h: 18,
    glowW: 24,
    glowH: 20,
    lookFov: 56,
    walkDolly: 8,
    sfx: 'video',
    glowLatches: true,
    goldEdge: true,
    hideHint: true,
    items: CRT_CHANNELS,
  },
  {
    id: 'record-bins',
    object: 'Record Bins',
    nav: 'Artists',
    hint: '',
    title: '',
    kicker: 'Artists',
    intro: '',
    accent: '#8a7a82',
    // v18 warehouse: island bins on concrete floor — lookto mid-room overview
    u: 0.5,
    v: 0.64,
    lookU: 0.5,
    lookV: 0.5,
    w: 30,
    h: 20,
    glowW: 30,
    glowH: 20,
    lookFov: 112,
    walkDolly: 2,
    sfx: 'artists',
    goldEdge: true,
    hideHint: true,
    items: ARTISTS,
  },
  {
    id: 'cash-register',
    object: 'Cash Register',
    nav: 'Shop',
    hint: '',
    title: '',
    kicker: 'New Releases',
    intro: '',
    accent: '#6b8f72',
    // v18 warehouse: register on checkout counter
    u: 0.27,
    v: 0.5,
    lookU: 0.27,
    lookV: 0.495,
    w: 9,
    h: 7.5,
    lookFov: 44,
    walkDolly: 7,
    sfx: 'shop',
    goldEdge: true,
    hideHint: true,
    items: SHOP_ITEMS,
  },
  {
    id: 'phone-booth',
    object: 'Rotary Phone',
    nav: 'Contact',
    hint: '',
    title: '',
    kicker: 'Contact',
    intro: '',
    accent: '#9aabb8',
    // v18 warehouse: black rotary beside the register
    u: 0.22,
    v: 0.51,
    lookU: 0.225,
    lookV: 0.505,
    w: 10,
    h: 7,
    lookFov: 42,
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
