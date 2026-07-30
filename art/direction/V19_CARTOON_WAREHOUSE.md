# Stereo-Mart v19 — cartoon warehouse ink (Balming Tiger UX)

## Audit (post-v18)

v18 delivered the cool PNW warehouse palette, glass chrome, ambient audio,
and krpano navigation preservation — but the equirect read as a dark
digital painting (meanL ≈ 38) and FG/MG parallax plates were nearly empty
(~1% / ~0.04% opaque). Hotspot craft and BT-style motion were already solid.

## Direction

Immersive full-screen exhibition — not a traditional site.
Primary UX/motion reference: balmingtiger.com (conveyor nav, glass panels,
enter gate, diegetic hotspots, custom cursor).
Visual identity: underground PNW industrial record shop in **cartoon
hand-drawn** ink — late-90s Japanese game manuals, PS2 concept art,
architectural drawings, Y2K editorial illustration.

## Illustration

Equirect master: `art/stereo-mart-equirect-cartoon-v19.png`
Web bake: `public/textures/store_pano_v19.webp` (+ off / LQIP webp+avif)
Parallax: `store_pano_fg_v19.webp`, `store_pano_mg_v19.webp` (~30%+ opaque)

Palette: charcoal · cool grey · oxidized silver · muted blue · concrete beige · moss green.

## Hotspot UV blueprint (preserved)

| id | u | v |
|---|---|---|
| listening-booth | 0.50 | 0.40 |
| crt-tv | 0.688 | 0.48 |
| record-bins | 0.50 | 0.64 |
| cash-register | 0.27 | 0.50 |
| phone-booth | 0.22 | 0.51 |

CRT retuned to the v19 plate (file_u ≈ 0.31); other anchors unchanged.

## Bake

```bash
python3 scripts/compose-v19-equirect.py
python3 scripts/build-v19-pano.py
python3 scripts/export-stereo-mart-brand-assets.py
```
