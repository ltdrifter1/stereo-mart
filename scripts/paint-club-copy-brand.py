#!/usr/bin/env python3
"""Paint Club Copy over Stereo-Mart lettering on the live v20 plates."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
INK = (35, 40, 64, 255)
CREAM = (236, 228, 210, 255)
RED = (166, 58, 50, 255)
GREEN = (92, 102, 72, 255)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def globe(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, mirror: bool) -> None:
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=CREAM, outline=INK, width=max(3, r // 18))
    for rx in (int(r * 0.33), int(r * 0.62), int(r * 0.88)):
        draw.ellipse((cx - rx, cy - r + 4, cx + rx, cy + r - 4), outline=INK, width=max(2, r // 28))
    draw.line((cx, cy - r + 4, cx, cy + r - 4), fill=INK, width=max(2, r // 28))
    for k, yoff in ((0.55, -int(r * 0.38)), (0.78, int(r * 0.22))):
        rx = int(r * k)
        bbox = (cx - rx, cy + yoff - 8, cx + rx, cy + yoff + 8)
        draw.arc(bbox, 200, 340, fill=INK, width=max(2, r // 30))

    band_h = max(18, int(r * 0.28))
    draw.rectangle((cx - r + 4, cy - band_h // 2, cx + r - 4, cy + band_h // 2), fill=CREAM)
    label = "YPOC BULC" if mirror else "CLUB COPY"
    f = font(max(12, int(r * 0.22)))
    bbox = draw.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2, cy - th / 2 - 2), label, font=f, fill=INK)

    ban_h = max(14, int(r * 0.2))
    by = cy + int(r * 0.28)
    draw.rectangle((cx - r + 6, by, cx + r - 6, by + ban_h), fill=RED)
    hang = "TUOGNAH" if mirror else "HANGOUT"
    f2 = font(max(10, int(r * 0.14)))
    bbox = draw.textbbox((0, 0), hang, font=f2)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2, by + (ban_h - th) / 2 - 1), hang, font=f2, fill=CREAM)


def crate_label(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=6, fill=(140, 48, 42, 255), outline=INK, width=3)
    f = font(max(11, (y1 - y0) // 3))
    label = "CLUB COPY"
    bbox = draw.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((x0 + x1 - tw) / 2, (y0 + y1 - th) / 2 - 1), label, font=f, fill=CREAM)


def patch(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Scale from the 4096×2048 master.
    sx, sy = w / 4096, h / 2048
    globe(d, int(2038 * sx), int(612 * sy), max(36, int(140 * sx)), False)
    globe(d, int(1810 * sx), int(848 * sy), max(52, int(200 * sx)), True)
    crate_label(
        d,
        (
            int(955 * sx),
            int(1388 * sy),
            int(1165 * sx),
            int(1495 * sy),
        ),
    )

    out = Image.alpha_composite(im, layer).convert("RGB")
    out.save(path, "WEBP", quality=82, method=6)
    print(f"patched {path.name} {out.size}")


def main() -> None:
    tex = ROOT / "public" / "textures"
    for name in ("store_pano_v20.webp", "store_pano_off_v20.webp", "store_pano_lqip_v20.webp"):
        p = tex / name
        if p.exists():
            patch(p)


if __name__ == "__main__":
    main()
