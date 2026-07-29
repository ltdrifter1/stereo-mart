#!/usr/bin/env python3
"""Align painted landmarks to authored hotspot UV boxes (v11 file-space)."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "stereo-mart-pano-v12-src.png"

# Source pixel boxes (1536×1024) — must match sections.ts / build-v12-pano.py
LANDMARKS = {
    "crt": {
        "dst": (112, 432, 246, 566),
        "src": (20, 340, 295, 665),
    },
    "cash-register": {
        "dst": (958, 462, 1085, 568),
        "src": (1155, 382, 1238, 468),
    },
    "phone-booth": {
        "dst": (1108, 498, 1222, 576),
        "src": (1205, 388, 1345, 545),
    },
}


def paste_box(im: Image.Image, src_box: tuple, dst_box: tuple) -> None:
    sx0, sy0, sx1, sy1 = src_box
    dx0, dy0, dx1, dy1 = dst_box
    patch = im.crop((sx0, sy0, sx1, sy1))
    patch = patch.resize((dx1 - dx0, dy1 - dy0), Image.Resampling.LANCZOS)
    im.paste(patch, (dx0, dy0))


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    for name, boxes in LANDMARKS.items():
        paste_box(im, boxes["src"], boxes["dst"])
        print(f"patched {name}")
    im.save(SRC)
    pano = ROOT / "art" / "pano.png"
    im.save(pano)
    print(f"wrote {pano}")


if __name__ == "__main__":
    main()
