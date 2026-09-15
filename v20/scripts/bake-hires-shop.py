#!/usr/bin/env python3
"""Bake a native 8192×4096 Stereo-Mart shop plate + object silhouettes.

This is NOT a Lanczos-only upscale of the 1536 concept plate. The 1536
interior (and street) plates stay the layout authority so hotspot ath/atv
stay aimed at the painted objects. At 8192 we:

  1. Place the interior plate into 2:1 equirect space (same convention as
     make-equirect.py — stylized 16:9 shop as a spherical wrap).
  2. Redraw ink at native 1–2px from the *original* 1536 line art (the
     upscaled ink is ~5px mush; we restroke it sharp).
  3. Paint high-frequency gouache/paper grain, floorboard pores, brick
     mortar, record-spine ticks, poster fiber, and ceiling plaster — all
     generated at 8192, tiled/seam-safe.
  4. High-pass the street plate into the storefront glass so the window
     band gains street-ink frequency without replacing the layout.
  5. Cross-fade the 0/360 seam on a quiet band (object pixels are spared).
  6. Cut object-shaped glow masks from the painted cells (flood to ink)
     plus prop-sheet alphas as shape priors. No circles / slabs.

Usage:
  python3 v20/scripts/bake-hires-shop.py [--width 8192] [--skip-8k-public]

Outputs (see v20/HIRES_PLATE.md):
  v20/art/plates/pano-equirect-master.webp     8192×4096 (optional commit)
  public/textures/store_pano_v20.webp          4096×2048 lights-on
  public/textures/store_pano_v20_2k.webp       2048×1024 mobile
  public/textures/store_pano_off_v20.webp      4096×2048 lights-off
  public/textures/store_pano_lqip_v20.webp     512×256
  public/hotspots/silhouette-id-map.webp       2048×1024 object IDs
  public/hotspots/<id>_silhouette.webp         per-object debug crops
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
V20 = ROOT / "v20"
INTERIOR = V20 / "art" / "plates" / "pano-interior-plate.png"
STREET = V20 / "art" / "plates" / "street-exterior-plate.png"
PROPS = V20 / "art" / "props"
PUBLIC_TEX = ROOT / "public" / "textures"
PUBLIC_HS = ROOT / "public" / "hotspots"
MASTER_WEBP = V20 / "art" / "plates" / "pano-equirect-master.webp"
MASTER_JPG = V20 / "art" / "plates" / "pano-equirect-master.jpg"

INK = np.array([35.0, 40.0, 64.0], dtype=np.float32)
CREAM = np.array([236.0, 228.0, 210.0], dtype=np.float32)
YELLOW = np.array([224.0, 182.0, 79.0], dtype=np.float32)

# Primary objects — NAVIGATION.md ath/atv. half extents in UV.
# id -> (ath, atv, du, dv, prop_prior or None)
OBJECTS: dict[str, tuple[float, float, float, float, str | None]] = {
    "listening-booth": (-88, -6, 0.055, 0.12, "listen"),
    "crt-tv": (-78, 22, 0.045, 0.07, "crt"),
    "record-bins": (-175, -25, 0.075, 0.10, "posters"),
    "cash-register": (172, 5, 0.075, 0.095, "crate"),
    "cassette-rack": (138, -12, 0.048, 0.12, "cassettes"),
    "front-door": (44, -3, 0.042, 0.13, "door"),
    "desk": (95, 15, 0.065, 0.095, "desk"),
    "phone-booth": (43, 13, 0.028, 0.035, "mailslot"),
    "lamp": (88, 5, 0.035, 0.09, None),
}

OBJECT_IDS = {
    "listening-booth": 1,
    "crt-tv": 2,
    "record-bins": 3,
    "cash-register": 4,
    "cassette-rack": 5,
    "front-door": 6,
    "desk": 7,
    "phone-booth": 8,
    "lamp": 9,
}


def ath_atv_to_file_uv(ath: float, atv: float) -> tuple[float, float]:
    """File-space UV of the webp (no BackSide U-flip). R3F applies the flip at sample time."""
    u = ((ath + 180.0) / 360.0) % 1.0
    v = (atv + 90.0) / 180.0
    return u, max(0.0, min(1.0, v))


def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def wrap_crop(arr: np.ndarray, u0: float, v0: float, u1: float, v1: float) -> tuple[np.ndarray, int]:
    """Crop a UV box; if it wraps in U, roll so the crop is contiguous.

    Returns (crop, roll) where roll is the pixel shift applied to axis=1.
    """
    h, w = arr.shape[:2]
    x0 = int(round(u0 * w)) % w
    x1 = int(round(u1 * w)) % w
    y0 = int(np.clip(round(v0 * h), 0, h - 1))
    y1 = int(np.clip(round(v1 * h), 1, h))
    if x1 > x0:
        return arr[y0:y1, x0:x1].copy(), 0
    # wraps: roll so x0 becomes 0
    rolled = np.roll(arr, -x0, axis=1)
    width = (w - x0) + x1
    return rolled[y0:y1, :width].copy(), x0


def place_wrap(dest: np.ndarray, src: np.ndarray, u0: float, v0: float, roll: int) -> None:
    h, w = dest.shape[:2]
    ch, cw = src.shape[:2]
    x0 = (int(round(u0 * w)) - roll) % w
    y0 = int(np.clip(round(v0 * h), 0, h - ch))
    if x0 + cw <= w:
        dest[y0 : y0 + ch, x0 : x0 + cw] = np.maximum(dest[y0 : y0 + ch, x0 : x0 + cw], src)
    else:
        left = w - x0
        dest[y0 : y0 + ch, x0:] = np.maximum(dest[y0 : y0 + ch, x0:], src[:, :left])
        dest[y0 : y0 + ch, : cw - left] = np.maximum(dest[y0 : y0 + ch, : cw - left], src[:, left:])


def native_ink_stroke(plate_rgb: np.ndarray, w: int, h: int) -> np.ndarray:
    """Sharp 8192 ink from the original plate's line art (not the upscaled mush)."""
    gray = luma(plate_rgb.astype(np.float32))
    sx = ndimage.sobel(gray, axis=1)
    sy = ndimage.sobel(gray, axis=0)
    mag = np.hypot(sx, sy)
    thr = float(np.percentile(mag, 78))
    edge = mag > thr
    edge = ndimage.binary_closing(edge, iterations=1)
    # upsample edges nearest so strokes stay 1 plate-px → ~5 master-px, then
    # erode back to a 1.5–2px native ribbon
    edge8 = np.array(
        Image.fromarray(edge.astype(np.uint8) * 255).resize((w, h), Image.Resampling.NEAREST)
    ) > 127
    dist = ndimage.distance_transform_edt(~edge8)
    stroke = np.clip(1.0 - dist / 2.15, 0.0, 1.0) ** 1.35
    return stroke.astype(np.float32)


def paper_grain(h: int, w: int, seed: int = 20) -> np.ndarray:
    rng = np.random.RandomState(seed)
    n0 = rng.randn(h // 8, w // 8).astype(np.float32)
    n1 = rng.randn(h // 3, w // 3).astype(np.float32)
    n2 = rng.randn(h // 1, w // 8).astype(np.float32)  # stretched — brush
    a = ndimage.zoom(n0, (h / n0.shape[0], w / n0.shape[1]), order=1)
    b = ndimage.zoom(n1, (h / n1.shape[0], w / n1.shape[1]), order=1)
    c = ndimage.zoom(n2, (h / n2.shape[0], w / n2.shape[1]), order=1)
    g = 0.55 * a + 0.32 * b + 0.13 * c
    g -= g.mean()
    g /= np.std(g) + 1e-6
    return g


def paint_materials(rgb: np.ndarray, grain: np.ndarray) -> np.ndarray:
    """Native-res floor / brick / spine / plaster frequency."""
    h, w, _ = rgb.shape
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    xx = np.linspace(0.0, 1.0, w, dtype=np.float32)[None, :]
    out = rgb.astype(np.float32)
    lum = luma(out)

    # Ceiling plaster (zenith)
    ceil = smoothstep(0.28, 0.16, yy[:, 0])[:, None]
    plaster = grain * 7.5
    out += (plaster * ceil * (0.55 + 0.45 * (1.0 - lum / 255.0)))[..., None]

    # Floorboard pores — anisotropic grain along x, more in nadir
    floor = smoothstep(0.66, 0.74, yy[:, 0])[:, None]
    # wood rings: stretch grain in X
    wood = ndimage.uniform_filter(grain, size=(1, 11))
    ticks = (np.sin(xx * w * math.pi / 9.5 + wood * 1.8) * 0.5 + 0.5) * floor
    out[..., 0] += wood * 5.5 * floor
    out[..., 1] += wood * 3.8 * floor
    out[..., 2] += wood * 2.2 * floor
    out -= (ticks * 6.0 * ((lum < 140).astype(np.float32)))[..., None] * np.array(
        [0.35, 0.28, 0.18]
    )

    # Brick mortar on the side walls (not the glass mid-band)
    wall = ((xx < 0.20) | (xx > 0.82)).astype(np.float32)
    wall = wall * smoothstep(0.22, 0.30, yy) * smoothstep(0.72, 0.62, yy)
    # running-bond mortar
    by = (yy * h / 22.0).astype(np.int32)
    stagger = (by % 2) * 0.5
    mortar_h = (np.abs(((yy * h) % 22.0) - 1.2) < 1.15).astype(np.float32)
    mortar_v = (np.abs((((xx + stagger * 18.0 / w) * w) % 36.0) - 1.1) < 1.05).astype(
        np.float32
    )
    mortar = np.clip(mortar_h + mortar_v, 0, 1) * wall * 0.55
    out = out * (1.0 - 0.18 * mortar[..., None]) + INK[None, None, :] * (0.18 * mortar[..., None])

    # Record-spine ticks in warm/brown mid-band pockets (crates + shelves)
    warm = (
        (out[..., 0] > out[..., 2] + 8)
        & (lum > 40)
        & (lum < 170)
        & (yy > 0.38)
        & (yy < 0.72)
    ).astype(np.float32)
    spine = (np.abs((xx * w) % 5.2 - 1.1) < 0.55).astype(np.float32)
    spine = spine * warm * 0.35
    out = out * (1.0 - 0.22 * spine[..., None]) + INK * (0.22 * spine[..., None])

    # Poster fiber — slightly cooler noise on cream/paper mid walls
    paper = ((lum > 150) & (yy > 0.22) & (yy < 0.58)).astype(np.float32)
    out += (grain * 4.2 * paper)[..., None] * np.array([0.9, 0.85, 0.7])

    return np.clip(out, 0, 255)


def blend_street_highpass(rgb: np.ndarray, street: Image.Image) -> np.ndarray:
    """Add street-plate ink frequency into the storefront glass, layout intact."""
    h, w, _ = rgb.shape
    st = np.asarray(street.resize((w, h), Image.Resampling.LANCZOS), dtype=np.float32)
    blur = ndimage.gaussian_filter(st, sigma=(2.2, 2.2, 0))
    hp = st - blur
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    xx = np.linspace(0.0, 1.0, w, dtype=np.float32)[None, :]
    # Soft window band — center of the shop plate
    win = np.exp(-((xx - 0.50) ** 2) / (2 * 0.11**2) - ((yy - 0.42) ** 2) / (2 * 0.12**2))
    win = np.clip(win, 0, 1)
    rgb = rgb + hp * win[..., None] * 0.42
    return np.clip(rgb, 0, 255)


def blend_seam(rgb: np.ndarray) -> np.ndarray:
    """Seam-safe wrap; preserve high-contrast object pixels."""
    h, w, _ = rgb.shape
    band = max(24, int(w * 0.012))
    a = rgb.astype(np.float32)
    left = a[:, :band].copy()
    right = a[:, w - band :].copy()
    right_mirr = right[:, ::-1]
    lum_l = luma(left)
    lum_r = luma(right_mirr)
    # skip blend where either side is a dark ink stroke or a saturated prop
    busy = (np.abs(lum_l - lum_r) > 28) | (np.minimum(lum_l, lum_r) < 48)
    for i in range(band):
        wgt = 0.5 * (1.0 - i / band)
        mask = (~busy[:, i]).astype(np.float32) * wgt
        m = mask[:, None]
        a[:, i] = (1 - m) * left[:, i] + m * right_mirr[:, i]
        a[:, w - 1 - i] = (1 - m) * right_mirr[:, i] + m * left[:, i]
    # force exact wrap
    a[:, 0] = a[:, -1]
    return np.clip(a, 0, 255)


def lights_off(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float32) / 255.0
    dark = a**1.22
    dark[..., 0] *= 0.34
    dark[..., 1] *= 0.42
    dark[..., 2] *= 0.60
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    warm = np.zeros_like(a)
    pools = [
        (0.50, 0.42, 0.16, 0.55),  # storefront
        (0.256, 0.528, 0.05, 0.85),  # desk lamp
        (0.744, 0.467, 0.06, 0.40),  # listening station
    ]
    for fu, fv, radius, gain in pools:
        cx, cy = fu * w, fv * h
        d2 = ((xx - cx) / (radius * w)) ** 2 + ((yy - cy) / (radius * w)) ** 2
        glow = np.exp(-d2)[..., None] * gain
        warm += glow * np.array([0.88, 0.76, 0.48])
    out = np.clip(dark + warm * a * 0.8, 0, 1)
    return (out * 255.0).astype(np.uint8)


def load_prop_alpha(name: str | None) -> np.ndarray | None:
    if not name:
        return None
    for path in (PROPS / f"{name}.png", ROOT / "art" / "props" / f"{name}.png"):
        if path.exists():
            im = Image.open(path).convert("RGBA")
            return np.asarray(im)[..., 3]
    return None


def extract_cell(
    rgb: np.ndarray,
    u: float,
    v: float,
    du: float,
    dv: float,
    prior: np.ndarray | None,
) -> np.ndarray:
    """Color-distance cell around the object + optional painted prop alpha."""
    u0, u1 = u - du, u + du
    v0, v1 = max(0.0, v - dv), min(1.0, v + dv)
    crop, _roll = wrap_crop(rgb, u0, v0, u1, v1)
    ch, cw = crop.shape[:2]
    cy, cx = ch // 2, cw // 2
    seed = np.median(crop[max(0, cy - 3) : cy + 4, max(0, cx - 3) : cx + 4].reshape(-1, 3), axis=0)
    dist = np.sqrt(((crop.astype(np.float32) - seed) ** 2).sum(axis=2))
    # pick a threshold that keeps a mid-size object, not the whole crop
    cell = None
    for pct in (18, 24, 32, 40, 52, 64):
        t = float(np.percentile(dist, pct))
        cand = dist <= max(t, 12.0)
        lab, _n = ndimage.label(cand)
        sl = lab[cy, cx]
        if sl == 0:
            continue
        blob = lab == sl
        blob = ndimage.binary_fill_holes(blob)
        cov = float(blob.mean())
        if 0.08 <= cov <= 0.72:
            cell = blob
            break
        if cell is None or abs(cov - 0.35) < abs(float(cell.mean()) - 0.35):
            cell = blob
    if cell is None:
        cell = np.zeros((ch, cw), dtype=bool)
        cell[cy - 6 : cy + 7, cx - 6 : cx + 7] = True

    if prior is not None and prior.size:
        # fit prior (trim empty bounds) into the crop, centered
        ys, xs = np.nonzero(prior > 40)
        if ys.size > 20:
            pr = prior[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            scale = min(cw / pr.shape[1], ch / pr.shape[0]) * 0.88
            nw, nh = max(8, int(pr.shape[1] * scale)), max(8, int(pr.shape[0] * scale))
            fitted = np.array(
                Image.fromarray(pr).resize((nw, nh), Image.Resampling.BILINEAR)
            )
            canvas = np.zeros((ch, cw), dtype=np.uint8)
            y0 = max(0, cy - nh // 2)
            x0 = max(0, cx - nw // 2)
            y1, x1 = min(ch, y0 + nh), min(cw, x0 + nw)
            canvas[y0:y1, x0:x1] = fitted[: y1 - y0, : x1 - x0]
            prior_m = canvas > 48
            # prefer the painted prop silhouette when the color cell is a slab
            if cell.mean() > 0.55 or float((prior_m & cell).sum()) > 80:
                cell = prior_m | ndimage.binary_erosion(cell, iterations=1)

    cell = ndimage.binary_opening(cell, iterations=1)
    cell = ndimage.binary_closing(cell, iterations=2)
    return cell.astype(np.uint8)


def glow_channels(cell: np.ndarray, grain: np.ndarray) -> np.ndarray:
    """Painted edge glow: G=edge, B=fill. Irregular, not a ring/slab."""
    if cell.max() == 0:
        return np.zeros((*cell.shape, 2), dtype=np.float32)
    dist_in = ndimage.distance_transform_edt(cell)
    dist_out = ndimage.distance_transform_edt(1 - cell)
    # edge ribbon inside + a little outside
    edge = np.clip(1.0 - np.abs(dist_in - 2.4) / 3.6, 0, 1)
    edge = np.where(cell | (dist_out < 4.5), edge, 0)
    fill = np.clip(dist_in / (dist_in.max() + 1e-6), 0, 1) ** 1.3 * cell
    # irregularize with grain
    g = grain[: cell.shape[0], : cell.shape[1]]
    if g.shape != cell.shape:
        g = ndimage.zoom(g, (cell.shape[0] / g.shape[0], cell.shape[1] / g.shape[1]), order=1)
    edge = np.clip(edge * (0.75 + 0.35 * (0.5 + 0.5 * np.tanh(g))), 0, 1)
    fill = np.clip(fill * (0.55 + 0.25 * (0.5 + 0.5 * np.tanh(g * 0.8))), 0, 1)
    # kill rectangular "full crop" slabs
    return np.dstack([edge, fill]).astype(np.float32)


def save_webp(im: Image.Image, path: Path, quality: int, method: int = 4) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=method)
    print(f"wrote {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size/1024:.1f}KB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=int, default=8192)
    parser.add_argument("--skip-8k-public", action="store_true")
    parser.add_argument("--max-8k-mb", type=float, default=5.5)
    parser.add_argument(
        "--masks-only",
        action="store_true",
        help="Rebuild silhouettes from the existing 4096 production plate.",
    )
    args = parser.parse_args()

    w, h = args.width, args.width // 2
    assert INTERIOR.exists(), INTERIOR
    plate = Image.open(INTERIOR).convert("RGB")
    street = Image.open(STREET).convert("RGB")
    print(f"interior {plate.size}  street {street.size}  target {w}x{h}")

    if args.masks_only:
        on_4k = Image.open(PUBLIC_TEX / "store_pano_v20.webp").convert("RGB")
        grain = paper_grain(on_4k.height, on_4k.width)
        print(f"masks-only from {on_4k.size}")
    else:
        plate_np = np.asarray(plate)
        stroke = native_ink_stroke(plate_np, w, h)

        base = np.asarray(plate.resize((w, h), Image.Resampling.LANCZOS), dtype=np.float32)
        # restroke sharp ink
        base = base * (1.0 - 0.42 * stroke[..., None]) + INK * (0.42 * stroke[..., None])
        # cream gouache rim just outside the stroke
        rim = ndimage.gaussian_filter(stroke, 1.6) - stroke
        rim = np.clip(rim, 0, 1)
        base = base * (1.0 - 0.12 * rim[..., None]) + CREAM * (0.12 * rim[..., None])

        grain = paper_grain(h, w)
        flat = 1.0 - np.clip(stroke * 1.8, 0, 1)
        base += (grain * 5.5 * flat)[..., None]
        base = paint_materials(base, grain)
        base = blend_street_highpass(base, street)
        base = blend_seam(base)
        master = np.clip(base, 0, 255).astype(np.uint8)
        master_im = Image.fromarray(master, "RGB")

        PUBLIC_TEX.mkdir(parents=True, exist_ok=True)
        on_4k = master_im.resize((4096, 2048), Image.Resampling.LANCZOS)
        on_4k = on_4k.filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=2))
        save_webp(on_4k, PUBLIC_TEX / "store_pano_v20.webp", quality=84)

        on_2k = master_im.resize((2048, 1024), Image.Resampling.LANCZOS)
        save_webp(on_2k, PUBLIC_TEX / "store_pano_v20_2k.webp", quality=80)

        off_4k = Image.fromarray(lights_off(np.asarray(on_4k)), "RGB")
        save_webp(off_4k, PUBLIC_TEX / "store_pano_off_v20.webp", quality=80)

        lqip = master_im.resize((512, 256), Image.Resampling.LANCZOS)
        lqip = lqip.filter(ImageFilter.GaussianBlur(1.6))
        save_webp(lqip, PUBLIC_TEX / "store_pano_lqip_v20.webp", quality=68)

        save_webp(master_im, MASTER_WEBP, quality=80, method=4)
        mb = MASTER_WEBP.stat().st_size / (1024 * 1024)
        print(f"8k master {mb:.2f}MB")
        if mb <= args.max_8k_mb and not args.skip_8k_public:
            save_webp(master_im, PUBLIC_TEX / "store_pano_v20_8k.webp", quality=80, method=4)
        else:
            pub8 = PUBLIC_TEX / "store_pano_v20_8k.webp"
            if pub8.exists():
                pub8.unlink()
            print(f"skip public 8k ({mb:.2f}MB > {args.max_8k_mb} or skipped)")

        if w == 8192:
            master_im.save(MASTER_JPG, quality=88, optimize=True)
            print(f"wrote {MASTER_JPG.relative_to(ROOT)}  {MASTER_JPG.stat().st_size/1024:.1f}KB")

    # --- object silhouettes in equirect UV ---
    id_h, id_w = 1024, 2048
    id_rgb = np.zeros((id_h, id_w, 3), dtype=np.float32)
    work = np.asarray(on_4k.resize((id_w, id_h), Image.Resampling.BILINEAR))
    gsmall = ndimage.zoom(grain, (id_h / grain.shape[0], id_w / grain.shape[1]), order=1)

    meta = []
    for name, (ath, atv, du, dv, prop) in OBJECTS.items():
        u, v = ath_atv_to_file_uv(ath, atv)
        oid = OBJECT_IDS[name]
        prior = load_prop_alpha(prop)
        cell = extract_cell(work, u, v, du, dv, prior)
        u0, v0 = u - du, max(0.0, v - dv)
        crop, roll = wrap_crop(work, u0, v0, u + du, min(1.0, v + dv))
        # cell is in crop space — rebuild if extract used same crop
        # extract_cell already cropped internally; re-run channels on returned cell
        ch = glow_channels(cell, gsmall)
        # paint into id map
        id_crop = np.zeros((cell.shape[0], cell.shape[1], 3), dtype=np.float32)
        on = cell > 0
        id_crop[..., 0] = np.where(on, oid / 255.0, 0)
        id_crop[..., 1] = ch[..., 0]
        id_crop[..., 2] = ch[..., 1]
        place_wrap(id_rgb, id_crop, u0, v0, roll)

        # debug crop
        sil = np.zeros((cell.shape[0], cell.shape[1], 4), dtype=np.uint8)
        sil[..., 0] = np.clip(CREAM[0] * (1 - ch[..., 0]) + YELLOW[0] * ch[..., 0], 0, 255)
        sil[..., 1] = np.clip(CREAM[1] * (1 - ch[..., 0]) + YELLOW[1] * ch[..., 0], 0, 255)
        sil[..., 2] = np.clip(CREAM[2] * (1 - ch[..., 0]) + YELLOW[2] * ch[..., 0], 0, 255)
        sil[..., 3] = np.clip((ch[..., 0] * 200 + ch[..., 1] * 70) * 255, 0, 255).astype(np.uint8)
        Image.fromarray(sil, "RGBA").save(PUBLIC_HS / f"{name}_silhouette.webp", "WEBP", quality=80)
        coverage = float(on.mean()) if on.size else 0
        print(f"  mask {name:18s} id={oid} cover={coverage:.3f} {cell.shape[1]}x{cell.shape[0]}")
        meta.append(
            {
                "id": name,
                "maskId": oid,
                "ath": ath,
                "atv": atv,
                "u": round(u, 5),
                "v": round(v, 5),
                "coverage": round(coverage, 4),
            }
        )

    id_u8 = np.clip(id_rgb * 255.0, 0, 255).astype(np.uint8)
    # A from any channel
    alpha = np.clip(id_u8[..., 1].astype(np.uint16) + id_u8[..., 2].astype(np.uint16), 0, 255).astype(
        np.uint8
    )
    id_rgba = np.dstack([id_u8, alpha])
    Image.fromarray(id_rgba, "RGBA").save(
        PUBLIC_HS / "silhouette-id-map.webp", "WEBP", lossless=True, method=4
    )
    print(f"wrote public/hotspots/silhouette-id-map.webp  {id_w}x{id_h}")

    (V20 / "art" / "plates" / "hires-bake-meta.json").write_text(
        json.dumps(
            {
                "master": [w, h],
                "production": [4096, 2048],
                "mobile": [2048, 1024],
                "lqip": [512, 256],
                "idMap": [id_w, id_h],
                "objects": meta,
                "note": "Ink restroked from 1536 line art; materials painted at native master resolution.",
            },
            indent=2,
        )
        + "\n"
    )
    print("done")


if __name__ == "__main__":
    main()
