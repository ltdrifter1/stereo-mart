#!/usr/bin/env python3
"""Bake the painted interior plate into a 2:1 equirectangular master.

Basics-only pipeline step:
  1. resample the 16:9 plate to 2:1 (slight vertical squash — fine for
     stylized art; repaint fixes go into the plate, not here)
  2. cross-fade the horizontal wrap seam so left/right edges meet cleanly
  3. emit the full-size master plus a tiny blurred LQIP preview

Usage:
  python3 v20/scripts/make-equirect.py [--width 8192]

Output:
  v20/art/plates/pano-equirect-master.png   (WIDTHx WIDTH/2)
  v20/art/plates/pano-equirect-lqip.jpg     (512x256, blurred)

The master then feeds krpanotools makepano for the multires cube tiles in
v20/krpano/panos/.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PLATE = ROOT / "art" / "plates" / "pano-interior-plate.png"
MASTER = ROOT / "art" / "plates" / "pano-equirect-master.png"
LQIP = ROOT / "art" / "plates" / "pano-equirect-lqip.jpg"

SEAM_PX_FRACTION = 0.015  # width of the wrap cross-fade band


def blend_seam(img: Image.Image) -> Image.Image:
    """Cross-fade the left edge over the (wrapped) right edge."""
    w, h = img.size
    band = max(8, int(w * SEAM_PX_FRACTION))
    img = img.convert("RGB")
    left = img.crop((0, 0, band, h))
    right = img.crop((w - band, 0, w, h))
    for x in range(band):
        t = x / (band - 1)  # 0 at outer edge -> 1 inward
        lcol = left.crop((x, 0, x + 1, h))
        rcol = right.crop((x, 0, x + 1, h))
        # pull each edge toward the opposite edge's pixels
        img.paste(Image.blend(rcol, lcol, 0.5 + t / 2), (x, 0))
        img.paste(Image.blend(lcol.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
                              rcol, 0.5 + (1 - t) / 2), (w - band + x, 0))
    return img


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=int, default=8192)
    args = parser.parse_args()

    w = args.width
    h = w // 2

    plate = Image.open(PLATE)
    master = plate.resize((w, h), Image.Resampling.LANCZOS)
    master = blend_seam(master)
    master.save(MASTER, optimize=True)
    print(f"master  {MASTER.relative_to(ROOT)}  {master.size[0]}x{master.size[1]}")

    lqip = master.resize((512, 256), Image.Resampling.LANCZOS)
    lqip = lqip.filter(ImageFilter.GaussianBlur(2.2))
    lqip.save(LQIP, quality=70)
    print(f"lqip    {LQIP.relative_to(ROOT)}  512x256")


if __name__ == "__main__":
    main()
