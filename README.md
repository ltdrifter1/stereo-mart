# STEREO-MART

`stereo-mart.com` — immersive **360° illustrated record shop**.

> **v20 is live on `/`.** The Next.js sphere now loads
> `public/textures/store_pano_v20.webp` (baked from
> [`v20/`](v20/README.md)). The KRPano skeleton + full art pipeline also
> live under `v20/` for the eventual viewer swap. Legacy v17–v19 textures
> remain in `public/textures/` unused.

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

Live texture is **v20** (`public/textures/store_pano_v20.webp`), baked from
the illustrated plate in [`v20/`](v20/README.md):

```bash
python3 v20/scripts/make-equirect.py              # 8192 master + mobile + LQIP
# then copy mobile → public/textures/store_pano_v20.webp (see last commit)
```

KRPano tour (full rebuild target) lives under `v20/krpano/`. The Next.js
R3F shell is a temporary host until the licensed krpano viewer is wired in.
## Deploy

Vercel (Next.js). Point `stereo-mart.com` at this project.
