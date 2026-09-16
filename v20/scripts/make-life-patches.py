#!/usr/bin/env python3
"""Extract / generate idle-life sprites from the Stereo-Mart plate.

Cat + speaker cone are cropped from the 8192 master so they sit on the
painted objects. The ceiling fan is polar-stretched on the plate, so a
plaster cover hides the paint and the shop's own fan.png blades spin on
top. Clouds are original Stereo-Mart gouache (ART_DIRECTION.md palette),
not plate copies and not balmingtiger assets.

Writes public/hotspots/life/* and prints ath/atv + plane degrees for
lib/roomLife.ts.

Usage:  python3 v20/scripts/make-life-patches.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
MASTER = ROOT / "art" / "plates" / "pano-equirect-master.jpg"
CAT_SRC = ROOT / "art" / "props" / "cat_patch.png"
OUT = REPO / "public" / "hotspots" / "life"
PROPS = ROOT / "art" / "props"

# Cat crop in the 1536×1024 layout space (make-patches.py).
CAT_BOX_1536 = (10, 596, 132, 700)
PLATE_W, PLATE_H = 1536, 1024


def save_webp(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", lossless=True, quality=100, method=6)


def feather_circle(h: int, w: int, cy: float, cx: float, radius: float, fade: float) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot(xx - cx, yy - cy)
    inner = max(1.0, radius - fade)
    alpha = np.clip((radius - r) / max(fade, 1e-3), 0, 1)
    alpha = np.where(r <= inner, 1.0, alpha)
    return (alpha * 255.0).astype(np.uint8)


def extract_fan(master: Image.Image) -> dict:
    """Hide the painted zenith fan with plaster, spin the Stereo-Mart prop.

    Equirect polar stretch makes a pixel-circle crop miss the blades, so the
    cover is generated from sampled ceiling plaster and the spinning sprite
    is the shop's own fan.png (blades + hub only — stem/chain stay off).
    """
    rgb = np.asarray(master)
    h, w, _ = rgb.shape
    # Cream hub lamp — measured on the 8192 plate (storefront ceiling).
    x0, y0, x1, y1 = 3396, 210, 4796, 710
    crop = rgb[y0:y1, x0:x1]
    lamp = (
        (crop[..., 0] > 185)
        & (crop[..., 1] > 165)
        & (crop[..., 2] < 190)
        & (crop.mean(axis=2) > 165)
    )
    if lamp.sum() < 20:
        raise SystemExit("fan hub lamp not found")
    ys, xs = np.nonzero(lamp)
    cy, cx = float(ys.mean()) + y0, float(xs.mean()) + x0

    # Ceiling plaster beside the fan (not ink, not blades).
    samples = []
    for px, py in ((3500, 250), (4600, 500), (4700, 280)):
        samples.append(rgb[py, px])
    plaster = np.array([148.0, 128.0, 98.0])

    size = 768
    cover_size = 256
    yy, xx = np.mgrid[0:cover_size, 0:cover_size].astype(np.float32)
    rng = np.random.default_rng(7)
    grain = rng.normal(0, 5.5, (cover_size, cover_size))
    cover_rgb = np.zeros((cover_size, cover_size, 3), dtype=np.float32)
    cover_rgb[..., 0] = plaster[0] + grain
    cover_rgb[..., 1] = plaster[1] + grain * 0.9
    cover_rgb[..., 2] = plaster[2] + grain * 0.75
    cover_a = feather_circle(
        cover_size, cover_size, cover_size / 2, cover_size / 2, cover_size / 2 - 4, 48
    )
    cover = Image.fromarray(
        np.dstack([np.clip(cover_rgb, 0, 255).astype(np.uint8), cover_a]), "RGBA"
    )

    prop = Image.open(PROPS / "fan.png").convert("RGBA")
    pa = np.asarray(prop)
    # Rotor centre of the 311×204 sheet prop (blade disc, not the hanging lamp).
    hcx, hcy = 156.0, 96.0
    blade_r = 152.0
    pad = int(blade_r + 16)
    canvas = Image.new("RGBA", (pad * 2, pad * 2), (0, 0, 0, 0))
    canvas.paste(prop, (pad - int(hcx), pad - int(hcy)), prop)
    arr = np.asarray(canvas).copy()
    ch, cw = arr.shape[:2]
    yy, xx = np.mgrid[0:ch, 0:cw].astype(np.float32)
    dx, dy = xx - cw / 2, yy - ch / 2
    circ = np.hypot(dx, dy) <= blade_r
    stem = (dy < -30) & (np.abs(dx) < 22)
    chain = (dy > 36) & (np.abs(dx) < 20)
    arr[..., 3] = np.where(circ & ~stem & ~chain, arr[..., 3], 0)
    fan = Image.fromarray(arr, "RGBA").resize((size, size), Image.Resampling.LANCZOS)

    save_webp(cover, OUT / "fan_cover.webp")
    save_webp(fan, OUT / "fan.webp")
    cover.save(PROPS / "fan_cover.png")
    fan.save(PROPS / "fan_patch.png")

    # Billboard is circular in world space; degrees are the true look-size
    # (equirect X is polar-stretched, so we do not use pixel width).
    wdeg = 27.0
    ath = 360.0 * cx / w - 180.0
    atv = 180.0 * cy / h - 90.0
    return {
        "id": "fan",
        "ath": round(float(ath), 2),
        "atv": round(float(atv), 2),
        "wdeg": wdeg,
        "hdeg": wdeg,
        "px": [int(size), int(size)],
    }


def extract_speaker(master: Image.Image) -> dict:
    """Large woofer under the rabbit sticker (ath −114 / atv 20)."""
    rgb = np.asarray(master)
    h, w, _ = rgb.shape
    file_u = (-114 + 180) / 360.0
    file_v = (20 + 90) / 180.0
    cx, cy = file_u * w, file_v * h
    # The rabbit sits on the cone; nudge onto the big woofer centre.
    cy += 8
    half = 210
    sx0, sy0 = int(cx - half), int(cy - half)
    sx1, sy1 = int(cx + half), int(cy + half)
    patch = rgb[sy0:sy1, sx0:sx1].copy()
    ph, pw = patch.shape[:2]
    lcx, lcy = cx - sx0, cy - sy0
    yy, xx = np.mgrid[0:ph, 0:pw].astype(np.float32)
    dist = np.hypot(xx - lcx, yy - lcy)
    # Woofer is the dark concentric disc.
    lum = patch.mean(axis=2)
    r = 118
    disc = dist <= r
    alpha = feather_circle(ph, pw, lcy, lcx, r + 2, 7)
    cone = Image.fromarray(np.dstack([patch, alpha]), "RGBA")
    bbox = cone.getbbox()
    if bbox:
        cone = cone.crop(bbox)
    save_webp(cone, OUT / "speaker_cone.webp")
    cone.save(PROPS / "speaker_cone.png")
    wdeg = (2 * r + 8) * 360.0 / w
    hdeg = (2 * r + 8) * 180.0 / h
    ath = 360.0 * cx / w - 180.0
    atv = 180.0 * (cy) / h - 90.0
    return {
        "id": "speaker",
        "ath": round(float(ath), 2),
        "atv": round(float(atv), 2),
        "wdeg": round(float(wdeg), 2),
        "hdeg": round(float(hdeg), 2),
        "px": [int(cone.width), int(cone.height)],
    }


def extract_cat(master: Image.Image) -> dict:
    """Re-export the plate cat patch (already pixel-aligned)."""
    mw, mh = master.size
    x0, y0, x1, y1 = CAT_BOX_1536
    sx, sy = mw / PLATE_W, mh / PLATE_H
    # Prefer the already-feathered patch if it matches this plate crop.
    if CAT_SRC.exists():
        cat = Image.open(CAT_SRC).convert("RGBA")
    else:
        cat = master.crop((round(x0 * sx), round(y0 * sy), round(x1 * sx), round(y1 * sy))).convert(
            "RGBA"
        )
    save_webp(cat, OUT / "cat_patch.webp")
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return {
        "id": "cat",
        "ath": round(360 * cx / PLATE_W - 180, 2),
        "atv": round(180 * cy / PLATE_H - 90, 2),
        "wdeg": round((x1 - x0) * 360 / PLATE_W, 2),
        "hdeg": round((y1 - y0) * 180 / PLATE_H, 2),
        "px": [int(cat.width), int(cat.height)],
    }


def paint_cloud(seed: int, w: int = 420, h: int = 220) -> Image.Image:
    """Soft overcast puffs — gouache blobs, no sticker outline."""
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    n = 6 if seed % 2 else 5
    for _ in range(n):
        cx = rng.uniform(w * 0.22, w * 0.78)
        cy = rng.uniform(h * 0.34, h * 0.66)
        sx = rng.uniform(w * 0.10, w * 0.20)
        sy = rng.uniform(h * 0.10, h * 0.20)
        acc += np.exp(-((xx - cx) ** 2 / (2 * sx ** 2) + (yy - cy) ** 2 / (2 * sy ** 2)))
    acc /= acc.max() + 1e-6
    field = np.clip(acc ** 1.05, 0, 1)
    grain = rng.normal(0, 0.04, (h, w))
    field = np.clip(field + grain * (field > 0.05), 0, 1)
    rgb = np.zeros((h, w, 3), dtype=np.float32)
    rgb[..., 0] = 210 + field * 28
    rgb[..., 1] = 218 + field * 22
    rgb[..., 2] = 224 + field * 18
    alpha = np.clip(field * 210, 0, 220)
    out = Image.fromarray(
        np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha.astype(np.uint8)]),
        "RGBA",
    )
    return out.filter(ImageFilter.GaussianBlur(0.8))


def make_clouds() -> list[dict]:
    clouds = []
    for i, seed in enumerate((11, 29, 47), start=0):
        im = paint_cloud(seed)
        name = f"cloud_{'abc'[i]}"
        save_webp(im, OUT / f"{name}.webp")
        im.save(PROPS / f"{name}.png")
        clouds.append({"id": name, "px": [int(im.width), int(im.height)]})
    return clouds


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"missing {MASTER}")
    OUT.mkdir(parents=True, exist_ok=True)
    master = Image.open(MASTER).convert("RGB")
    meta = {
        "fan": extract_fan(master),
        "speaker": extract_speaker(master),
        "cat": extract_cat(master),
        "clouds": make_clouds(),
    }
    (OUT / "life-meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
