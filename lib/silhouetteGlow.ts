/**
 * Object-shaped hotspot glow — IDs packed into public/hotspots/silhouette-id-map.webp
 * (file-space UV, same as the pano webp). Amounts are written by Hotspot / LampHotspot.
 */
export const SILHOUETTE_MAP_SRC = '/hotspots/silhouette-id-map.webp';

export const SILHOUETTE_ID = {
  'listening-booth': 1,
  'crt-tv': 2,
  'record-bins': 3,
  'cash-register': 4,
  'cassette-rack': 5,
  'front-door': 6,
  desk: 7,
  'phone-booth': 8,
  lamp: 9,
} as const;

export type SilhouetteName = keyof typeof SILHOUETTE_ID;

/** Index by mask id (1–9). 0 unused. Written every frame by Hotspot / Lamp. */
export const silhouetteAmount = { current: new Float32Array(10) };

/** Keyboard focus amounts — Hotspot's rAF would otherwise overwrite a11y. */
export const silhouetteKeyboard = { current: new Float32Array(10) };

export function setSilhouetteAmount(name: SilhouetteName, value: number) {
  silhouetteAmount.current[SILHOUETTE_ID[name]] = value;
}

export function setSilhouetteKeyboard(name: SilhouetteName, value: number) {
  silhouetteKeyboard.current[SILHOUETTE_ID[name]] = value;
}
