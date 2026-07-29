#!/usr/bin/env python3
"""Export STEREO-MART OG + CRT panel thumb from panorama source (Y2K 2:1 redraw)."""
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "stereo-mart-pano-v12-src.png"
OUT_OG = ROOT / "public" / "og.jpg"
OUT_THUMB = ROOT / "public" / "panel-thumbs" / "stereo-mart-tv.webp"
OUT_ICON = ROOT / "public" / "apple-touch-icon.png"


def sharpen(im: Image.Image) -> Image.Image:
    return im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))


def export_og(src: Image.Image) -> None:
    # Storefront + CRT + sign band → 1200×630 OG.
    w, h = src.size
    crop = src.crop((int(w * 0.02), int(h * 0.08), int(w * 0.55), int(h * 0.62)))
    og = crop.resize((1200, 630), Image.Resampling.LANCZOS)
    og = sharpen(og)
    og.save(OUT_OG, "JPEG", quality=90, optimize=True)
    print(f"wrote {OUT_OG} from crop {crop.size}")


def export_thumb(src: Image.Image) -> None:
    w, h = src.size
    crop = src.crop((int(w * 0.02), int(h * 0.35), int(w * 0.20), int(h * 0.72)))
    thumb = crop.resize((256, 256), Image.Resampling.LANCZOS)
    thumb = sharpen(thumb)
    thumb.save(OUT_THUMB, "WEBP", quality=90)
    print(f"wrote {OUT_THUMB}")


def export_icon(src: Image.Image) -> None:
    w, h = src.size
    crop = src.crop((int(w * 0.42), int(h * 0.12), int(w * 0.62), int(h * 0.42)))
    icon = crop.resize((180, 180), Image.Resampling.LANCZOS)
    icon = sharpen(icon)
    icon.save(OUT_ICON, optimize=True)
    print(f"wrote {OUT_ICON}")


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    export_og(src)
    export_thumb(src)
    export_icon(src)


if __name__ == "__main__":
    main()
