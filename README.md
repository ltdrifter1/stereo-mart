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

Equirectangular master is **2:1** PNW warehouse cartoon-ink art
(`art/stereo-mart-equirect-cartoon-v19.png`).
Web bake is **v19** (`public/textures/store_pano_v19.webp`) — charcoal-cool
underground shop, late-90s JP manual / PS2 concept line work.
Recommended print/master size is **8192×4096** (generate locally from the 2k plate).
Hero props sit in the mid band away from the wrap seam; zenith/nadir stay ceiling/floor.
Separate transparent prop sprites live in **`art/props/`** and **`public/hotspots/props/`**.
Foreground / midground parallax layers export to `store_pano_fg_v19.webp` and
`store_pano_mg_v19.webp`. Hotspot edge rims bake from plane silhouettes
(prop fallback for CRT / register / phone).

```bash
python3 scripts/compose-v19-equirect.py              # cartoon composite + layers
python3 scripts/build-v19-pano.py                    # webp / avif / edges / CRT / toys
python3 scripts/export-stereo-mart-brand-assets.py   # og / thumb / icon
```

## Deploy

Vercel (Next.js). Point `stereo-mart.com` at this project.
