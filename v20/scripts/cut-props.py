#!/usr/bin/env python3
"""Cut the generated props sheet into individual transparent overlays.

  1. flood the near-uniform sheet background from the borders
  2. label the remaining foreground into connected components
  3. snap each component to the nearest expected prop centroid (several
     components may belong to one prop, e.g. steam wisps)
  4. export each prop as a tight transparent PNG, plus a soft warm glow
     sprite for the navigation props

Usage:
  python3 v20/scripts/cut-props.py [--debug]

--debug also writes art/refs/props-cut-debug.png with labeled boxes.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "art" / "props" / "props-sheet.png"
OUT = ROOT / "art" / "props"
DEBUG = ROOT / "art" / "refs" / "props-cut-debug.png"

BG_TOL = 26          # per-channel tolerance around sampled background colour
MIN_AREA = 120       # ignore specks smaller than this (px)
PAD = 6              # transparent padding around each crop

# expected prop centroids on the 1024x1024 sheet -> output basename
EXPECTED = {
    "crate":          (172, 184),
    "cassettes":      (484, 175),
    "posters":        (858, 168),
    "desk":           (180, 538),
    "mailslot":       (434, 429),
    "cat_sleep":      (449, 546),
    "cat_blink":      (449, 668),
    "door":           (644, 546),
    # the hanging headphones cluster snaps into "listen" (one station prop)
    "listen":         (886, 613),
    "fan":            (148, 811),
    "platter":        (410, 811),
    "steam_a":        (616, 811),
    "ghost":          (710, 808),
    "lamp_on":        (886, 881),
    "sticker_rabbit": (346, 944),
    "sticker_turtle": (507, 955),
    "mushroom":       (668, 955),
}

# nav props get a paired glow sprite (see krpano/include/hotspots-nav.xml)
GLOW_PROPS = {"crate", "cassettes", "posters", "desk", "mailslot", "door", "listen"}
GLOW_RGB = (224, 182, 79)  # warm yellow #e0b64f


def background_mask(rgb: np.ndarray) -> np.ndarray:
    """True where the pixel belongs to the sheet background."""
    corners = np.concatenate([
        rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3),
        rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3),
    ])
    bg = corners.mean(axis=0)
    near_bg = (np.abs(rgb.astype(np.int16) - bg).max(axis=2) < BG_TOL)
    # keep only background regions connected to the border (so light pixels
    # inside a prop stay opaque)
    lab, n = ndimage.label(near_bg)
    border_labels = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    border_labels = border_labels[border_labels != 0]
    return np.isin(lab, border_labels)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    img = Image.open(SHEET).convert("RGB")
    rgb = np.asarray(img)
    h, w, _ = rgb.shape
    scale = w / 1024.0
    expected = {k: (x * scale, y * scale) for k, (x, y) in EXPECTED.items()}

    fg = ~background_mask(rgb)
    # close small gaps so loose pieces of one prop cluster together
    fg_closed = ndimage.binary_closing(fg, structure=np.ones((5, 5)))
    lab, n = ndimage.label(fg_closed)

    groups: dict[str, np.ndarray] = {}
    for idx in range(1, n + 1):
        comp = lab == idx
        area = int(comp.sum())
        if area < MIN_AREA:
            continue
        ys, xs = np.nonzero(comp)
        cy, cx = ys.mean(), xs.mean()
        name = min(expected, key=lambda k: (expected[k][0] - cx) ** 2 + (expected[k][1] - cy) ** 2)
        groups[name] = comp | groups.get(name, np.zeros_like(comp))

    dbg = img.copy()
    draw = ImageDraw.Draw(dbg)

    for name, mask in sorted(groups.items()):
        ys, xs = np.nonzero(mask)
        x0, x1 = xs.min(), xs.max() + 1
        y0, y1 = ys.min(), ys.max() + 1

        alpha = (mask & fg).astype(np.uint8) * 255
        rgba = np.dstack([rgb, alpha])[y0:y1, x0:x1]
        prop = Image.fromarray(rgba, "RGBA")
        # 1px feather so ink edges don't alias against the pano
        a = prop.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
        prop.putalpha(a)

        canvas = Image.new("RGBA", (prop.width + 2 * PAD, prop.height + 2 * PAD), (0, 0, 0, 0))
        canvas.paste(prop, (PAD, PAD), prop)
        canvas.save(OUT / f"{name}.png")
        print(f"{name:16s} {canvas.width:4d}x{canvas.height:<4d} area={int(mask.sum())}")

        if name in GLOW_PROPS:
            grow = max(6, int(min(canvas.size) * 0.06))
            ga = np.asarray(canvas.getchannel("A")) > 40
            ga = ndimage.binary_dilation(ga, iterations=grow)
            glow = Image.new("RGBA", canvas.size, (*GLOW_RGB, 0))
            glow.putalpha(Image.fromarray(ga.astype(np.uint8) * 200))
            glow = glow.filter(ImageFilter.GaussianBlur(grow * 0.9))
            glow.save(OUT / f"{name}_glow.png")

        draw.rectangle([x0, y0, x1, y1], outline=(200, 40, 40), width=3)
        draw.text((x0 + 4, y0 + 4), name, fill=(200, 40, 40))

    if args.debug:
        DEBUG.parent.mkdir(parents=True, exist_ok=True)
        dbg.save(DEBUG)
        print(f"debug   {DEBUG.relative_to(ROOT)}")

    missing = set(EXPECTED) - set(groups)
    if missing:
        print(f"WARNING not found: {sorted(missing)}")


if __name__ == "__main__":
    main()
