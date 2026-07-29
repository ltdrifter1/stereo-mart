/**
 * ─────────────────────────────────────────────────────────────────────────
 *  STEREO-MART IN-ROOM CONTENT CATALOG — edit this file to change what the store
 *  plays and sells. No other file needs touching for content updates.
 *
 *  · MUSIC_RELEASES → shelf rows in the Music (listening booth) panel.
 *      Each row opens a nest with transport, track list, and LISTEN ON pills.
 *      Level-1 shows album, artist, and track count. Drop preview MP3s in
 *      /public/audio/previews and cover art in /public/panel-thumbs.
 *  · CRT_CHANNELS   → channel-guide rows in the Videos panel. `videoSrc`
 *      plays on the in-room CRT; use `body` for the guide blurb. Rows with
 *      only `href` open outbound (e.g. YouTube).
 *  · ARTISTS        → roster rows in the Artists (record bins) panel.
 *  · SHOP_ITEMS     → shelf rows in the Shop (New Releases) panel.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type ListenLink = {
  label: string;
  href: string;
};

export type TrackItem = {
  title: string;
  duration?: string;
};

export type SectionItem = {
  label: string;
  meta?: string;
  detail?: string;
  /** Short CTA label (e.g. PLAY, BUY, EMAIL). */
  cta?: string;
  /** Outbound / mailto / hash link for the CTA. */
  href?: string;
  /** Accent letter / glyph fallback when no thumbSrc. */
  thumb?: string;
  /** Real cover / flyer art under /public/panel-thumbs. */
  thumbSrc?: string;
  /**
   * Local video URL played on the in-room CRT (Videos section).
   * When set, primary row click stays in the room instead of window.open.
   */
  videoSrc?: string;
  /**
   * Short in-room audio preview (Listening Booth / Shop).
   * Plays through the shared preview bus; ducks BGM.
   */
  previewSrc?: string;
  /** Music / Shop nest — track list shown in level-2 detail. */
  tracks?: TrackItem[];
  /** Music / Shop nest — streaming + buy pills. */
  listenOn?: ListenLink[];
  /**
   * In-panel prose — shelf blurb on Music/Shop level-1, and nest copy when set.
   */
  body?: string;
};

/** Cover art / thumbs under /public/panel-thumbs. */
export const ART = {
  atHome: '/panel-thumbs/at-home.webp',
  inletKnight: '/panel-thumbs/inlet-knight.webp',
  inletKnightTall: '/panel-thumbs/inlet-knight-tall.webp',
  /** Self-titled Inlet Knight album — tugboat porthole cover. */
  inletKnightAlbum: '/panel-thumbs/inlet-knight-album.webp',
  inletKnightAlbumTall: '/panel-thumbs/inlet-knight-album-tall.webp',
  summer: '/panel-thumbs/summer.webp',
  lions: '/panel-thumbs/lions.webp',
  rack: '/panel-thumbs/rack.webp',
  stereoMartTv: '/panel-thumbs/stereo-mart-tv.webp',
  charlie: '/panel-thumbs/charlie.webp',
  ltd: '/panel-thumbs/ltd.webp',
  classic: '/panel-thumbs/classic.webp',
  future: '/panel-thumbs/future.webp',
  ig: '/panel-thumbs/ig.webp',
  yt: '/panel-thumbs/yt.webp',
} as const;

/** Booth previews under /public/audio/previews. */
export const PREVIEW = {
  atHome: '/audio/previews/at-home.mp3',
  /** Inlet Knight LP — Mad About You booth snip. */
  inletKnight: '/audio/previews/inlet-knight.mp3',
  inletKnightRevive: '/audio/previews/inlet-knight-revive.mp3',
  inletKnightMovin: '/audio/previews/inlet-knight-movin.mp3',
  summer: '/audio/previews/summer.mp3',
  lions: '/audio/previews/lions-gate.mp3',
  rack: '/audio/previews/rack-em.mp3',
} as const;

/** Branded CRT loops under /public/videos (not SMPTE color bars). */
export const VIDEO = {
  station: '/videos/channel_b.mp4',
  atHome: '/videos/channel_athome.mp4',
  lions: '/videos/channel_lions.mp4',
  classic: '/videos/channel_classic.mp4',
  future: '/videos/channel_future.mp4',
} as const;

/** Stripe + Bandcamp buy destinations (checkout only — browse stays in-room). */
export const BUY = {
  atHomeDigital: 'https://buy.stripe.com/cNidRa6DB7o463KdshfrW0r',
  summerDigital: 'https://buy.stripe.com/00w14o5zxdMs2Ry73TfrW0s',
  lionsDigital: 'https://buy.stripe.com/bJe7sM4vt9wc63K9c1frW0i',
  rackDigital: 'https://buy.stripe.com/bJe8wQd1ZbEk77O87XfrW0t',
  tee: 'https://buy.stripe.com/3cI00k6DB8s877O1JzfrW0o',
  hat: 'https://buy.stripe.com/6oU14o2nl23KgIoewlfrW0n',
  bikini: 'https://buy.stripe.com/eVq7sMfa70ZG77O2NDfrW0m',
  inletBc: 'https://inletknight.bandcamp.com',
  inletKnightAlbum: 'https://inletknight.bandcamp.com/album/inlet-knight',
  ltdBc: 'https://ltdrifta.bandcamp.com',
  driftaBc: 'https://drifta.bandcamp.com',
  rackBc: 'https://ltdrifta.bandcamp.com/album/rack-em',
} as const;

/* ── MUSIC — listening booth releases ──────────────────────────────────── */

export const MUSIC_RELEASES: SectionItem[] = [
  {
    label: 'At Home',
    meta: 'Inlet Knight',
    detail: '3 tracks',
    cta: 'Listen',
    thumbSrc: ART.atHome,
    previewSrc: PREVIEW.atHome,
    tracks: [
      { title: 'After All', duration: '2:22' },
      { title: 'Will I See You Again?', duration: '3:58' },
      { title: 'At Home', duration: '3:44' },
    ],
    listenOn: [
      { label: 'Buy Now', href: BUY.atHomeDigital },
    ],
  },
  {
    label: 'Inlet Knight',
    detail: '16 tracks',
    cta: 'Listen',
    thumbSrc: ART.inletKnightAlbum,
    previewSrc: PREVIEW.inletKnight,
    href: BUY.inletKnightAlbum,
    tracks: [
      { title: 'Revive Him', duration: '2:27' },
      { title: 'Whatever', duration: '3:27' },
      { title: 'Mad About You', duration: '3:58' },
      { title: 'All Falls Down', duration: '4:42' },
      { title: 'Les Misérables', duration: '2:16' },
      { title: 'Heartbreaker', duration: '3:52' },
      { title: "Movin'", duration: '3:26' },
      { title: 'Sunday Afternoon', duration: '2:55' },
      { title: 'Hard to Ignore', duration: '4:09' },
      { title: 'The Get Down', duration: '1:37' },
      { title: '3AM', duration: '2:59' },
      { title: 'Another Day', duration: '4:58' },
      { title: 'Is It Cool?', duration: '4:02' },
      { title: 'You Wanted Me', duration: '2:49' },
      { title: 'Next Year', duration: '4:07' },
      { title: 'Art of Losing', duration: '2:06' },
    ],
    listenOn: [{ label: 'Buy Now', href: BUY.inletKnightAlbum }],
  },
];

/* ── VIDEOS — CRT channels (branded station + release loops) ────────────── */

export const CRT_CHANNELS: SectionItem[] = [
  {
    label: 'STEREO-MART-TV',
    cta: 'Tune',
    thumbSrc: ART.stereoMartTv,
    videoSrc: VIDEO.station,
  },
];

/* ── ARTISTS — record-bin roster ───────────────────────────────────────── */

export const ARTISTS: SectionItem[] = [
  {
    label: 'Inlet Knight',
    meta: 'Cumberland, BC',
    detail: 'Artist · Producer',
    cta: 'Listen',
    thumb: 'IK',
    thumbSrc: ART.inletKnight,
    href: BUY.inletBc,
  },
];

/* ── SHOP — New Releases counter ───────────────────────────────────────── */

export const SHOP_ITEMS: SectionItem[] = [
  {
    label: 'Inlet Knight',
    cta: 'Buy Now',
    thumb: 'IK',
    thumbSrc: ART.inletKnightAlbum,
    href: BUY.inletKnightAlbum,
    previewSrc: PREVIEW.inletKnight,
    tracks: [
      { title: 'Revive Him', duration: '2:27' },
      { title: 'Whatever', duration: '3:27' },
      { title: 'Mad About You', duration: '3:58' },
      { title: 'All Falls Down', duration: '4:42' },
      { title: 'Les Misérables', duration: '2:16' },
      { title: 'Heartbreaker', duration: '3:52' },
      { title: "Movin'", duration: '3:26' },
      { title: 'Sunday Afternoon', duration: '2:55' },
      { title: 'Hard to Ignore', duration: '4:09' },
      { title: 'The Get Down', duration: '1:37' },
      { title: '3AM', duration: '2:59' },
      { title: 'Another Day', duration: '4:58' },
      { title: 'Is It Cool?', duration: '4:02' },
      { title: 'You Wanted Me', duration: '2:49' },
      { title: 'Next Year', duration: '4:07' },
      { title: 'Art of Losing', duration: '2:06' },
    ],
    listenOn: [{ label: 'Buy Now', href: BUY.inletKnightAlbum }],
  },
  {
    label: 'At Home',
    meta: 'Inlet Knight',
    cta: 'Buy Now',
    thumb: 'IK',
    thumbSrc: ART.atHome,
    href: BUY.atHomeDigital,
    previewSrc: PREVIEW.atHome,
    tracks: [
      { title: 'After All', duration: '2:22' },
      { title: 'Will I See You Again?', duration: '3:58' },
      { title: 'At Home', duration: '3:44' },
    ],
    listenOn: [{ label: 'Buy Now', href: BUY.atHomeDigital }],
  },
];
