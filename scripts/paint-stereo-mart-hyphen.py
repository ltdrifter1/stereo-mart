#!/usr/bin/env python3
"""Rewrite painted brand lettering to STEREO-MART (hyphenated)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "stereo-mart-pano-v12-src.png"
PANO = ROOT / "art" / "pano.png"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def outlined_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int] = (18, 18, 18),
    width: int = 2,
) -> None:
    x, y = xy
    for dx in range(-width, width + 1):
        for dy in range(-width, width + 1):
            if dx == 0 and dy == 0:
                continue
            draw.text((x + dx, y + dy), text, font=font, fill=outline)
    draw.text(xy, text, font=font, fill=fill)


def fit_font(text: str, max_w: int, max_h: int, start: int = 64) -> ImageFont.FreeTypeFont:
    size = start
    while size > 8:
        font = ImageFont.truetype(FONT, size)
        bbox = font.getbbox(text)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if tw <= max_w and th <= max_h:
            return font
        size -= 1
    return ImageFont.truetype(FONT, 10)


def paint_main_sign(im: Image.Image) -> None:
    # Storefront marquee (teal board, orange lettering).
    box = (118, 72, 438, 148)
    x0, y0, x1, y1 = box
    patch = im.crop(box).copy()
    draw = ImageDraw.Draw(patch)
    # Repaint teal face, keep thin gold rim by inset fill.
    teal = (62, 118, 128)
    draw.rounded_rectangle((4, 4, x1 - x0 - 5, y1 - y0 - 5), radius=4, fill=teal)
    text = "STEREO-MART"
    font = fit_font(text, max_w=x1 - x0 - 28, max_h=y1 - y0 - 22, start=48)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (x1 - x0 - tw) / 2 - bbox[0]
    ty = (y1 - y0 - th) / 2 - bbox[1] - 1
    outlined_text(draw, (tx, ty), text, font, fill=(232, 118, 48), width=2)
    # Wavy underline accent
    mid_y = y1 - y0 - 10
    draw.arc((18, mid_y - 6, x1 - x0 - 18, mid_y + 4), 200, 340, fill=(240, 210, 80), width=2)
    im.paste(patch, (x0, y0))


def paint_door_decal(im: Image.Image) -> None:
    # Circular glass sticker — approx center (340, 295), r≈34
    cx, cy, r = 340, 295, 34
    box = (cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2)
    patch = im.crop(box).copy()
    draw = ImageDraw.Draw(patch)
    local_cx = r + 2
    local_cy = r + 2
    draw.ellipse(
        (local_cx - r, local_cy - r, local_cx + r, local_cy + r),
        fill=(48, 98, 112),
        outline=(18, 18, 18),
        width=3,
    )
    # Two-line lockup so hyphen fits cleanly
    f1 = ImageFont.truetype(FONT, 11)
    f2 = ImageFont.truetype(FONT, 11)
    for text, font, oy in (("STEREO-", f1, -10), ("MART", f2, 4)):
        bbox = font.getbbox(text)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = local_cx - tw / 2 - bbox[0]
        ty = local_cy + oy - th / 2 - bbox[1]
        outlined_text(draw, (tx, ty), text, font, fill=(240, 200, 70), width=1)
    im.paste(patch, (box[0], box[1]))


def paint_shirt(im: Image.Image) -> None:
    # Cashier purple tee lettering
    box = (1210, 418, 1310, 468)
    x0, y0, x1, y1 = box
    patch = im.crop(box).copy()
    draw = ImageDraw.Draw(patch)
    # Soft purple fill over old lettering
    purple = (118, 74, 148)
    draw.rounded_rectangle((2, 2, x1 - x0 - 3, y1 - y0 - 3), radius=3, fill=purple)
    text = "STEREO-MART"
    font = fit_font(text, max_w=x1 - x0 - 10, max_h=y1 - y0 - 10, start=16)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (x1 - x0 - tw) / 2 - bbox[0]
    ty = (y1 - y0 - th) / 2 - bbox[1]
    outlined_text(draw, (tx, ty), text, font, fill=(232, 118, 48), width=1)
    im.paste(patch, (x0, y0))


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    paint_main_sign(im)
    paint_door_decal(im)
    paint_shirt(im)
    # Light grain so lettering matches cel texture
    grain = Image.effect_noise(im.size, 8).convert("L")
    noise = Image.merge("RGB", (grain, grain, grain))
    im = Image.blend(im, noise, 0.018)
    im = im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=40, threshold=2))
    im.save(SRC)
    im.save(PANO)
    print(f"wrote {SRC.name} and {PANO.name} with STEREO-MART lettering")


if __name__ == "__main__":
    main()
