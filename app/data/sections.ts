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
 * Click-and-drag to look, then click a feature to open its room.
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
    accent: '#ffb347',
    // v11 pano: LISTEN tower on the far back wall (file ≈ x 713–823).
    // Mid shelf = turntable + headphones; island bins stay below at higher v.
    u: 0.5,
    v: 0.42,
    lookU: 0.5,
    lookV: 0.415,
    w: 18,
    h: 22,
    lookFov: 62,
    walkDolly: 8,
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
    accent: '#7ad7ff',
    // v13 pano: CRT on the low cabinet by the storefront — u/v aims the set;
    // w/h are the set footprint. CrtScreen insets the video to painted glass
    // (~0.44×0.375 of w/h, XY-biased) — see SCREEN_* in CrtScreen.tsx.
    u: 0.902,
    v: 0.493,
    // Frame the set in the room — not watch-mode punch-in (was fov 22 / too close).
    lookU: 0.902,
    lookV: 0.493,
    w: 21.7,
    h: 16.5,
    // Glow / edge mask covers the whole painted set, not just the tube.
    glowW: 24.5,
    glowH: 14,
    lookFov: 48,
    walkDolly: 10,
    sfx: 'video',
    // Keep warm gold aura latched while focused; watch overlay arms when
    // a channel row plays (NavigationController checks items.length).
    glowLatches: true,
    goldEdge: true,
    hideHint: true,
    // CRT channels — edit app/data/catalog.ts to add or change rows.
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
    accent: '#ff7a9c',
    // v9 pano: central record-bin island on the moss rug
    // (file x 688–882, y 462–645 of 1536×1024). Hit hugs the wood tub;
    // glow is a touch tighter so the rim doesn’t spill onto the moss.
    // Island on the moss rug — kept lower than the back-wall LISTEN tower.
    u: 0.489,
    v: 0.555,
    // Zoomed out over the whole open room
    lookU: 0.5,
    lookV: 0.53,
    w: 34,
    h: 22,
    glowW: 34,
    glowH: 22,
    lookFov: 105,
    walkDolly: 5,
    sfx: 'artists',
    goldEdge: true,
    hideHint: true,
    // Roster — edit app/data/catalog.ts to add or change artists.
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
    accent: '#9dff8a',
    // v13: cream register body ONLY (file ≈ x 1138–1249, y 422–500).
    // Tight footprint so glow/hit do not include shelves behind the counter.
    u: 0.223,
    v: 0.45,
    lookU: 0.223,
    lookV: 0.45,
    w: 9,
    h: 7.5,
    lookFov: 48,
    walkDolly: 8,
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
    accent: '#e8c07a',
    // v13: black rotary on the counter to the right of the register
    // (file ≈ x 1258–1360, y 442–519).
    u: 0.148,
    v: 0.469,
    lookU: 0.148,
    lookV: 0.469,
    w: 11,
    h: 6.5,
    lookFov: 50,
    walkDolly: 8,
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
