# STEREO-MART

`stereo-mart.com` — immersive **360° illustrated record shop** (Next.js + React Three Fiber).

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

Equirectangular master is **2:1** cartoon shop art
(`art/stereo-mart-equirect-cartoon-v17.png` / `art/stereo-mart-pano-v12-src.png`).
Web bake is **v17** (`public/textures/store_pano_v17.webp`) — bold-ink cartoon,
balmingtiger-warm cream/teal/night palette.
Recommended print/master size is **8192×4096** (generate locally from the 4k plate).
Hero props sit in the mid band away from the wrap seam; zenith/nadir stay ceiling/floor.
Separate transparent prop sprites live in **`art/props/`** and **`public/hotspots/props/`**.
Hotspot edge rims bake from plane silhouettes (prop fallback for register/phone).

```bash
python3 scripts/patch-stereo-mart-v12-landmarks.py  # after landmark edits
python3 scripts/build-v12-pano.py
python3 scripts/export-stereo-mart-brand-assets.py  # og / thumb / icon
```

## Deploy

Vercel (Next.js). Point `stereo-mart.com` at this project.
