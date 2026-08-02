#!/usr/bin/env python3
"""Extract animation patches from the baked master + build light sprites.

Overlay props from the props sheet can't sit on top of their painted
counterparts (different drawings — they'd double-draw). Anything that must
move *in place* is therefore cropped straight out of the master plate so it
aligns pixel-perfectly, with a feathered alpha edge:

  cat_patch.png   — sleeping cat, tweened +-1.5% scale = breathing

Pure-light sprites are generated procedurally (additive blend, so no
alignment concerns):

  lamp_pool.png   — warm radial pool for the desk lamp flicker

Prints the krpano placement block (ath/atv/width/height) for each patch;
distorted-hotspot pixel size uses width = 2000 * tan(deg/2).

Usage:  python3 v20/scripts/make-patches.py
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "art" / "plates" / "pano-equirect-master.jpg"
OUT = ROOT / "art" / "props"

PLATE_W, PLATE_H = 1536, 1024  # coordinate space used below (plate pixels)
FEATHER = 10                   # alpha feather in master pixels

# name -> (x0, y0, x1, y1) in plate pixels
# (verified against rendered views via preview.html screenshot measurement)
PATCHES = {
    "cat_patch": (10, 596, 132, 700),
}


def deg_to_px(deg: float) -> int:
    return round(2000 * math.tan(math.radians(deg / 2)))


def main() -> None:
    master = Image.open(MASTER)
    mw, mh = master.size
    sx, sy = mw / PLATE_W, mh / PLATE_H

    for name, (x0, y0, x1, y1) in PATCHES.items():
        crop = master.crop((round(x0 * sx), round(y0 * sy), round(x1 * sx), round(y1 * sy)))
        crop = crop.convert("RGBA")

        # feathered rectangular alpha so the patch melts into the plate
        a = np.full((crop.height, crop.width), 255, dtype=np.uint8)
        alpha = Image.fromarray(a)
        border = Image.new("L", (crop.width - 2 * FEATHER, crop.height - 2 * FEATHER), 255)
        alpha = Image.new("L", crop.size, 0)
        alpha.paste(border, (FEATHER, FEATHER))
        alpha = alpha.filter(ImageFilter.GaussianBlur(FEATHER * 0.7))
        crop.putalpha(alpha)
        crop.save(OUT / f"{name}.png")

        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        ath = 360 * cx / PLATE_W - 180
        atv = 180 * cy / PLATE_H - 90
        wdeg = (x1 - x0) * 360 / PLATE_W
        hdeg = (y1 - y0) * 180 / PLATE_H
        print(f'{name}: ath="{ath:.1f}" atv="{atv:.1f}" '
              f'width="{deg_to_px(wdeg)}" height="{deg_to_px(hdeg)}"  '
              f"({crop.width}x{crop.height}px)")

    # warm additive light pool for the lamp flicker
    size = 256
    yy, xx = np.mgrid[0:size, 0:size]
    r = np.hypot(xx - size / 2, yy - size / 2) / (size / 2)
    fall = np.clip(1 - r, 0, 1) ** 2.2
    pool = np.zeros((size, size, 4), dtype=np.uint8)
    pool[..., 0] = 224
    pool[..., 1] = 182
    pool[..., 2] = 79
    pool[..., 3] = (fall * 190).astype(np.uint8)
    Image.fromarray(pool, "RGBA").save(OUT / "lamp_pool.png")
    print("lamp_pool: 256x256 additive sprite")


if __name__ == "__main__":
    main()
