#!/usr/bin/env python3
"""Export STEREO-MART OG + CRT panel thumb + apple icon from v19 master."""
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC_CANDIDATES = [
    ROOT / "art" / "stereo-mart-equirect-cartoon-v19.png",
    ROOT / "art" / "stereo-mart-equirect-warehouse-v18.png",
    ROOT / "art" / "stereo-mart-pano-v12-src.png",
]
OUT_OG = ROOT / "public" / "og.jpg"
OUT_THUMB = ROOT / "public" / "panel-thumbs" / "stereo-mart-tv.webp"
OUT_ICON = ROOT / "public" / "apple-touch-icon.png"


def find_src() -> Path:
    for p in SRC_CANDIDATES:
        if p.exists():
            return p
    raise SystemExit("no panorama source found")


def sharpen(im: Image.Image) -> Image.Image:
    return im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))


def export_og(src: Image.Image) -> None:
    # Center aisle + LISTEN wall → 1200×630 OG.
    w, h = src.size
    crop = src.crop((int(w * 0.28), int(h * 0.12), int(w * 0.78), int(h * 0.72)))
    og = crop.resize((1200, 630), Image.Resampling.LANCZOS)
    og = sharpen(og)
    og.save(OUT_OG, "JPEG", quality=90, optimize=True)
    print(f"wrote {OUT_OG} from crop {crop.size}")


def export_thumb(src: Image.Image) -> None:
    # CRT cabinet band (file-space ~0.24–0.40 on v19).
    w, h = src.size
    crop = src.crop((int(w * 0.24), int(h * 0.36), int(w * 0.42), int(h * 0.64)))
    thumb = crop.resize((256, 256), Image.Resampling.LANCZOS)
    thumb = sharpen(thumb)
    thumb.save(OUT_THUMB, "WEBP", quality=90)
    print(f"wrote {OUT_THUMB}")


def export_icon(src: Image.Image) -> None:
    w, h = src.size
    crop = src.crop((int(w * 0.42), int(h * 0.18), int(w * 0.62), int(h * 0.48)))
    icon = crop.resize((180, 180), Image.Resampling.LANCZOS)
    icon = sharpen(icon)
    icon.save(OUT_ICON, optimize=True)
    print(f"wrote {OUT_ICON}")


def main() -> None:
    src_path = find_src()
    print(f"src: {src_path}")
    src = Image.open(src_path).convert("RGB")
    export_og(src)
    export_thumb(src)
    export_icon(src)


if __name__ == "__main__":
    main()
