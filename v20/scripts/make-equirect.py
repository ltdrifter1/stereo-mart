#!/usr/bin/env python3
"""Bake the painted interior plate into a 2:1 equirectangular master.

  1. resample the 16:9 plate to 2:1 (slight vertical squash — fine for
     stylized art; repaint fixes go into the plate, not here)
  2. seam-safe wrap: cross-fade mirrored edge columns so the left and right
     edges meet on the exact same pixels (the seam lands on the quiet wall
     band per ART_DIRECTION.md, so the narrow blend is invisible)
  3. mild unsharp mask to keep ink lines crisp through the upscale
  4. emit the master (JPEG q92 above 4096 to keep the repo sane, PNG below),
     a tiny blurred LQIP preview, and a mobile-friendly 4096 JPEG

Usage:
  python3 v20/scripts/make-equirect.py [--width 8192]

Output:
  v20/art/plates/pano-equirect-master.jpg   (WIDTH x WIDTH/2)
  v20/art/plates/pano-equirect-mobile.jpg   (4096 x 2048)
  v20/art/plates/pano-equirect-lqip.jpg     (512 x 256, blurred)

The master feeds krpanotools makepano for multires cube tiles; until tiles
exist the tour loads the master directly as a <sphere> image.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PLATE = ROOT / "art" / "plates" / "pano-interior-plate.png"
MASTER = ROOT / "art" / "plates" / "pano-equirect-master.jpg"
MOBILE = ROOT / "art" / "plates" / "pano-equirect-mobile.jpg"
LQIP = ROOT / "art" / "plates" / "pano-equirect-lqip.jpg"

SEAM_FRACTION = 0.02  # width of the wrap cross-fade band (each side)


def blend_seam(img: Image.Image) -> Image.Image:
    """Cross-fade mirrored edge columns so column 0 == column W-1.

    For band index i (0 = outer edge), both edges converge to the average of
    the two original edge columns, ramping back to the untouched image at the
    inner end of the band.
    """
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape
    band = max(16, int(w * SEAM_FRACTION))

    left = a[:, :band].copy()               # columns 0..band-1
    right = a[:, w - band:].copy()          # columns w-band..w-1
    right_mirr = right[:, ::-1]             # right edge indexed from seam out

    for i in range(band):
        wgt = 0.5 * (1.0 - i / band)        # 0.5 at seam -> 0 inward
        a[:, i] = (1 - wgt) * left[:, i] + wgt * right_mirr[:, i]
        a[:, w - 1 - i] = (1 - wgt) * right_mirr[:, i] + wgt * left[:, i]

    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=int, default=8192)
    args = parser.parse_args()

    w = args.width
    h = w // 2

    plate = Image.open(PLATE)
    master = plate.resize((w, h), Image.Resampling.LANCZOS)
    master = master.filter(ImageFilter.UnsharpMask(radius=3, percent=60, threshold=2))
    master = blend_seam(master)

    if w > 4096:
        master.save(MASTER, quality=92, optimize=True)
    else:
        master.save(MASTER.with_suffix(".png"), optimize=True)
    print(f"master  {MASTER.relative_to(ROOT)}  {master.size[0]}x{master.size[1]}")

    mobile = master.resize((4096, 2048), Image.Resampling.LANCZOS)
    mobile.save(MOBILE, quality=88, optimize=True)
    print(f"mobile  {MOBILE.relative_to(ROOT)}  4096x2048")

    lqip = master.resize((512, 256), Image.Resampling.LANCZOS)
    lqip = lqip.filter(ImageFilter.GaussianBlur(2.2))
    lqip.save(LQIP, quality=70)
    print(f"lqip    {LQIP.relative_to(ROOT)}  512x256")


if __name__ == "__main__":
    main()
