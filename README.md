# STEREO-MART

`stereo-mart.com` — immersive **360° illustrated record shop**.

> **v20 is live on `/`.** The Next.js sphere loads the native-detail
> 8192 plate (`store_pano_v20_8k.webp` on capable GPUs, 4k/2k otherwise;
> see [`v20/HIRES_PLATE.md`](v20/HIRES_PLATE.md)). The KRPano skeleton +
> art pipeline also live under `v20/` for the eventual viewer swap.

## Routes

| Path | What |
|---|---|
| `/` | 360° store (enter → look around → hotspots) |
| `/#music` `#videos` `#artists` `#shop` `#contact` | Deep-link a section after enter |
| `/shop` | Brand bridge into the room (`/#shop`) |

## Content

Releases, CRT channels, artists, and shop rows live in **`app/data/catalog.ts`**.

Brand URLs / contact: **`lib/brand.ts`**.

## Develop

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- Shop bridge: http://localhost:3000/shop

## Panorama bake

Live texture is the native-detail v20 plate (LQIP → 2k/4k, 8k on capable
GPUs). See [`v20/HIRES_PLATE.md`](v20/HIRES_PLATE.md).

```bash
npm run bake:hires     # 8192 master + 4k/2k/LQIP + object silhouettes
npm run test:hires
```

KRPano tour (full rebuild target) lives under `v20/krpano/`. The Next.js
R3F shell is a temporary host until the licensed krpano viewer is wired in.
## Deploy

Vercel (Next.js). Point `stereo-mart.com` at this project.
