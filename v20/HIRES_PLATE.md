# Stereo-Mart hi-res plate + object silhouettes

Production 360 shop art for the Next.js / R3F viewer. This is **not** a
Lanczos-only upscale of the 1536 concept plate.

## Why not upscale

`v20/art/plates/pano-interior-plate.png` (1536×1024) is the **layout
authority** so `NAVIGATION.md` ath/atv stay aimed at the painted objects.
At 8192 that plate’s ink is ~5px mush. `bake-hires-shop.py` instead:

1. Places the interior into 2:1 equirect space (same 16:9→sphere wrap as
   `make-equirect.py`).
2. Restroke ink at native 1–2px from the *original* 1536 Sobel line art
   (nearest upsample, then a 2px ribbon — not the blurred Lanczos stroke).
3. Paints high-frequency gouache/paper grain, floorboard pores, running-bond
   brick mortar, record-spine ticks, poster fiber, and ceiling plaster
   **at 8192**.
4. High-pass of the street plate into the storefront glass (frequency only;
   layout stays the interior shop).
5. Object-sparing 0/360 seam blend; column 0 is forced equal to column −1.

No photos. No Balming Tiger assets.

## Files

| File | Size (approx) | Role |
|------|----------------|------|
| `v20/art/plates/pano-equirect-master.jpg` | 8192×4096, ~5.7 MB | committed 8k master |
| `public/textures/store_pano_v20_8k.webp` | 8192×4096, ~2.7 MB | desktop GPU upgrade |
| `public/textures/store_pano_v20.webp` | 4096×2048, ~1.6 MB | default / first hi plate |
| `public/textures/store_pano_v20_2k.webp` | 2048×1024, ~400 KB | mobile / coarse pointer |
| `public/textures/store_pano_off_v20.webp` | 4096×2048, ~514 KB | lights-off twin |
| `public/textures/store_pano_lqip_v20.webp` | 512×256, ~6 KB | gate / first paint |
| `public/hotspots/silhouette-id-map.webp` | 2048×1024 lossless | sphere ID / edge / fill |
| `public/hotspots/<id>_silhouette.webp` | crops | debug / review silhouettes |
| `v20/art/plates/hires-bake-meta.json` | — | coverage + UV dump |

The local `pano-equirect-master.webp` from the bake is a duplicate of the
public 8k webp and is **not** committed.

Git LFS is not used (not configured for these textures).

## Loading strategy (R3F)

`lib/pano.ts` `pickPanoSrc()`:

- LQIP is `useTexture` so the gate can resolve.
- **Mobile** (`pointer: coarse` or width &lt; 768, or `maxTextureSize` &lt; 4096):
  2k lights-on + 4k lights-off.
- **Desktop**: 4k first, then 8k if `maxTextureSize >= 8192`.
- Lights-off stays 4k. 8k swap does not re-fade through LQIP.

## Object-shaped hotspots

Shared billboard auras are gone. `SilhouetteGlow` samples a file-space ID
map on a BackSide sphere (same UV flip as the pano), so shapes stay locked
while panning, zooming, and on mobile.

Primary objects (`v20/NAVIGATION.md` + CRT + lamp):

| Object | hotspot id | mask id |
|--------|------------|---------|
| Listening Station | `listening-booth` | 1 |
| CRT Television | `crt-tv` | 2 |
| Poster Wall | `record-bins` | 3 |
| Record Crates / new arrivals | `cash-register` | 4 |
| Cassette Rack | `cassette-rack` | 5 |
| Glass Door / OPEN sign | `front-door` | 6 |
| Desk | `desk` | 7 |
| Mail Slot / contact | `phone-booth` | 8 |
| Desk lamp | `lamp` | 9 |

Masks are color-distance floods around the painted cell plus prop-sheet
alpha as a *shape prior* (props are not composited onto the plate — no
double-draw). Cassette rack and glass door read as honest rectangles
because those objects are rectangular. Invisible hit planes stay generous
and separate from the silhouette. Rest: invisible. Hover/focus: subtle.
Lookto/click: stronger. Keyboard: `.hotspot-a11y` buttons.

## Regenerate

```bash
pip install pillow numpy scipy
npm run bake:hires                 # full 8192 + derivatives + masks
python3 v20/scripts/bake-hires-shop.py --masks-only
python3 v20/scripts/bake-hires-shop.py --skip-8k-public
npm run test:hires
npm run test:nav
```

`--max-8k-mb` (default 8) skips copying the 8k webp into `public/` if the
master is too heavy for the repo.

## Checks

`scripts/validate-hires-plate.py` asserts exact 8192×4096, 2:1 aspect,
seam wrap, derivative sizes, ID map ids 1–9, and that 8k has more
high-frequency energy than a Lanczos of the 1536 plate.
