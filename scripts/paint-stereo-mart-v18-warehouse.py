#!/usr/bin/env python3
"""
Paint Stereo-Mart v18 equirect master — PNW industrial warehouse record shop.

Semi-realistic hand-drawn editorial illustration (not photoreal, not cartoon):
late-90s JP game manual / PS2 concept / underground sleeve / architectural ink.

Keeps hotspot UV anchors from sections.ts so krpano360 navigation stays valid.
Outputs art/stereo-mart-equirect-warehouse-v18.png (4096×2048) plus optional
layered FG/MG transparent plates for subtle sphere parallax.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "art" / "stereo-mart-equirect-warehouse-v18.png"
OUT_FG = ROOT / "art" / "layers" / "warehouse-fg-v18.png"
OUT_MG = ROOT / "art" / "layers" / "warehouse-mg-v18.png"
DIR_NOTE = ROOT / "art" / "direction" / "V18_WAREHOUSE_EDITORIAL.md"

W, H = 2048, 1024
RNG = random.Random(18)

# Palette — charcoal / cool grey / oxidized silver / muted blue / concrete / moss
CHARCOAL = (28, 30, 32)
INK = (18, 20, 22)
COOL_GREY = (92, 98, 104)
OXIDIZED = (140, 148, 152)
MUTED_BLUE = (74, 96, 118)
CONCRETE = (168, 160, 148)
MOSS = (78, 98, 72)
BRICK = (96, 72, 62)
BRICK_DARK = (62, 48, 42)
STEEL = (110, 118, 124)
STEEL_DARK = (58, 64, 70)
WINDOW_NIGHT = (32, 48, 62)
WARM_LAMP = (210, 180, 120)
CREAM_VINYL = (220, 210, 190)
CRT_BEZEL = (48, 46, 52)
PHONE_BLACK = (24, 24, 26)
REGISTER = (180, 176, 168)
GRAFFITI_A = (62, 110, 128)
GRAFFITI_B = (140, 90, 70)


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def mix(a, b, t):
    return tuple(clamp(a[i] * (1 - t) + b[i] * t) for i in range(3))


def darken(c, f=0.75):
    return tuple(clamp(x * f) for x in c)


def lighten(c, f=1.2):
    return tuple(clamp(x * f) for x in c)


def uv_px(u: float, v: float) -> tuple[int, int]:
    return int(u * W) % W, int(np.clip(v, 0, 1) * (H - 1))


def wrap_x(x: int) -> int:
    return x % W


def put(px, x, y, rgb, a=255):
    if y < 0 or y >= H:
        return
    x = wrap_x(x)
    if a >= 250:
        px[x, y] = rgb
    else:
        r0, g0, b0 = px[x, y]
        t = a / 255.0
        px[x, y] = (
            clamp(r0 * (1 - t) + rgb[0] * t),
            clamp(g0 * (1 - t) + rgb[1] * t),
            clamp(b0 * (1 - t) + rgb[2] * t),
        )


def disk(px, cx, cy, r, rgb, a=255):
    r = max(1, int(r))
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                put(px, cx + dx, cy + dy, rgb, a)


def ellipse_fill(px, cx, cy, rx, ry, rgb, a=255):
    rx, ry = max(1, int(rx)), max(1, int(ry))
    for dy in range(-ry, ry + 1):
        for dx in range(-rx, rx + 1):
            if (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0:
                put(px, cx + dx, cy + dy, rgb, a)


def stroke_ellipse(px, cx, cy, rx, ry, rgb, w=2):
    rx, ry = max(1, int(rx)), max(1, int(ry))
    for t in range(0, 360, 2):
        rad = math.radians(t)
        x = int(cx + math.cos(rad) * rx)
        y = int(cy + math.sin(rad) * ry)
        disk(px, x, y, w // 2, rgb)


def rect(px, x0, y0, x1, y1, rgb, a=255):
    y0, y1 = max(0, y0), min(H, y1)
    for y in range(y0, y1):
        for x in range(x0, x1):
            put(px, x, y, rgb, a)


def stroke_rect(px, x0, y0, x1, y1, rgb, w=2):
    for i in range(w):
        for x in range(x0, x1):
            put(px, x, y0 + i, rgb)
            put(px, x, y1 - 1 - i, rgb)
        for y in range(y0, y1):
            put(px, x0 + i, y, rgb)
            put(px, x1 - 1 - i, y, rgb)


def line(px, x0, y0, x1, y1, rgb, w=1):
    steps = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(steps + 1):
        t = i / steps
        x = int(x0 + (x1 - x0) * t)
        y = int(y0 + (y1 - y0) * t)
        disk(px, x, y, max(0, w // 2), rgb)


def noise_field(seed: int, shape, scale=1.0):
    rng = np.random.default_rng(seed)
    return rng.random(shape, dtype=np.float32) * scale


def paper_grain(img: Image.Image, amount=0.045) -> Image.Image:
    a = np.asarray(img).astype(np.float32)
    n = noise_field(42, a.shape[:2], 1.0)
    grain = (n - 0.5) * 255 * amount
    a[..., 0] = np.clip(a[..., 0] + grain, 0, 255)
    a[..., 1] = np.clip(a[..., 1] + grain * 0.92, 0, 255)
    a[..., 2] = np.clip(a[..., 2] + grain * 0.88, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def ink_edge(img: Image.Image) -> Image.Image:
    """Soft architectural ink via edge detect mixed into darker lines."""
    grey = img.convert("L")
    edges = grey.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(0.6))
    e = np.asarray(edges).astype(np.float32) / 255.0
    a = np.asarray(img).astype(np.float32)
    strength = np.clip(e * 0.55, 0, 1)[..., None]
    ink = np.array(INK, dtype=np.float32)
    a = a * (1 - strength) + ink * strength
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def paint_ceiling(px):
    for y in range(0, int(H * 0.28)):
        t = y / (H * 0.28)
        c = mix(STEEL_DARK, mix(CHARCOAL, MUTED_BLUE, 0.25), t * 0.4)
        for x in range(W):
            # corrugated / beam rhythm
            beam = 1.0 if (x // 96) % 7 == 0 else 0.0
            rib = 0.08 * math.sin(x * 0.085)
            shade = 1.0 - beam * 0.35 + rib
            put(px, x, y, darken(c, shade))
    # HVAC boxes near zenith band
    for u, size in ((0.18, 90), (0.42, 110), (0.68, 85), (0.88, 95)):
        cx, cy = uv_px(u, 0.08)
        rect(px, cx - size, cy - size // 2, cx + size, cy + size // 2, STEEL)
        stroke_rect(px, cx - size, cy - size // 2, cx + size, cy + size // 2, INK, 2)
        for i in range(-size + 8, size - 8, 14):
            line(px, cx + i, cy - size // 2 + 4, cx + i, cy + size // 2 - 4, darken(STEEL, 0.75), 1)
    # hanging pendant lamps
    for u in (0.28, 0.5, 0.72):
        cx, cy = uv_px(u, 0.12)
        line(px, cx, 0, cx, cy + 40, INK, 2)
        ellipse_fill(px, cx, cy + 55, 28, 18, WARM_LAMP, 220)
        stroke_ellipse(px, cx, cy + 55, 28, 18, INK, 2)
        # soft glow pool
        for r in range(80, 10, -8):
            a = int(28 * (1 - r / 80))
            ellipse_fill(px, cx, cy + 120, r * 2, r, lighten(WARM_LAMP, 1.1), a)


def paint_floor(px):
    for y in range(int(H * 0.62), H):
        t = (y - H * 0.62) / (H * 0.38)
        base = mix(STEEL_DARK, CONCRETE, 0.35 + t * 0.4)
        for x in range(W):
            crack = 0.92 if (x + y * 3) % 211 < 3 else 1.0
            puddle = 1.12 if ((x // 40) ^ (y // 30)) % 17 == 0 and t > 0.35 else 1.0
            put(px, x, y, darken(base, crack * puddle * (0.85 + 0.15 * (1 - t))))
    # cracked pavement lines
    for i in range(18):
        x0 = RNG.randint(0, W - 1)
        y0 = RNG.randint(int(H * 0.68), H - 20)
        x1 = x0 + RNG.randint(-180, 180)
        y1 = y0 + RNG.randint(20, 120)
        line(px, x0, y0, x1, y1, darken(CONCRETE, 0.55), 1)
    # puddle ellipses
    for _ in range(10):
        cx = RNG.randint(0, W - 1)
        cy = RNG.randint(int(H * 0.72), H - 40)
        rx, ry = RNG.randint(40, 120), RNG.randint(12, 28)
        ellipse_fill(px, cx, cy, rx, ry, mix(MUTED_BLUE, CHARCOAL, 0.55), 90)
        stroke_ellipse(px, cx, cy, rx, ry, mix(OXIDIZED, MUTED_BLUE, 0.5), 1)


def paint_brick_band(px, y0, y1, tone=BRICK):
    brick_h, brick_w = 28, 64
    for y in range(y0, y1):
        row = (y - y0) // brick_h
        offset = (brick_w // 2) if row % 2 else 0
        for x in range(W):
            col = (x + offset) // brick_w
            mottled = 0.88 + 0.18 * ((math.sin(col * 1.7 + row) + 1) * 0.5)
            mortar = (
                abs((x + offset) % brick_w) < 2
                or abs((y - y0) % brick_h) < 2
            )
            c = mix(CONCRETE, tone, 0.35) if mortar else darken(tone, mottled)
            # moss in damp lower courses
            if y > y1 - 80 and RNG.random() < 0.012:
                c = mix(c, MOSS, 0.55)
            put(px, x, y, c)


def paint_corrugated(px, y0, y1, base=STEEL):
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0)
        c0 = mix(base, STEEL_DARK, t * 0.35)
        for x in range(W):
            wave = 0.82 + 0.18 * abs(math.sin(x * 0.12))
            put(px, x, y, darken(c0, wave))


def paint_walls(px):
    # mid band: brick + steel panels
    paint_brick_band(px, int(H * 0.22), int(H * 0.58), BRICK)
    paint_corrugated(px, int(H * 0.48), int(H * 0.62), STEEL)
    # wainscot / lower concrete
    for y in range(int(H * 0.58), int(H * 0.72)):
        t = (y - H * 0.58) / (H * 0.14)
        c = mix(STEEL_DARK, CONCRETE, 0.4 + t * 0.3)
        for x in range(W):
            put(px, x, y, c)


def paint_window(px, u, v, ww, hh, night=True):
    cx, cy = uv_px(u, v)
    x0, y0 = cx - ww // 2, cy - hh // 2
    x1, y1 = cx + ww // 2, cy + hh // 2
    # frame
    stroke_rect(px, x0 - 6, y0 - 6, x1 + 6, y1 + 6, STEEL_DARK, 6)
    stroke_rect(px, x0 - 2, y0 - 2, x1 + 2, y1 + 2, INK, 2)
    # glass / night industrial district
    for y in range(y0, y1):
        for x in range(x0, x1):
            local_u = (x - x0) / max(1, ww)
            local_v = (y - y0) / max(1, hh)
            sky = mix(WINDOW_NIGHT, MUTED_BLUE, 0.35 + local_v * 0.2)
            # distant warehouses / loading docks silhouettes
            sil = 0
            if local_v > 0.45 and abs(math.sin(local_u * 12 + u * 5)) > 0.55:
                sil = 1
            if local_v > 0.62 and abs(math.sin(local_u * 7)) > 0.3:
                sil = 1
            c = darken(CHARCOAL, 0.7) if sil else sky
            # rain streaks
            if (x + y * 3) % 37 == 0:
                c = lighten(c, 1.15)
            # warm window dots in distance
            if sil and (x * 13 + y * 7) % 89 == 0:
                c = mix(c, WARM_LAMP, 0.55)
            put(px, x, y, c)
    # mullions
    mid_x = (x0 + x1) // 2
    mid_y = (y0 + y1) // 2
    line(px, mid_x, y0, mid_x, y1, STEEL_DARK, 3)
    line(px, x0, mid_y, x1, mid_y, STEEL_DARK, 3)


def paint_exterior_district(px):
    """Storefront / dock wall around u≈0.78–1.0 / 0.0–0.15 (file wrap)."""
    # large night windows near CRT (u≈0.91)
    paint_window(px, 0.82, 0.42, 220, 280)
    paint_window(px, 0.98, 0.42, 200, 260)
    paint_window(px, 0.08, 0.40, 180, 240)
    # shipping containers visible outside / mid wall
    for u, col in ((0.75, (90, 70, 58)), (0.05, (58, 78, 72))):
        cx, cy = uv_px(u, 0.55)
        rect(px, cx - 90, cy - 70, cx + 90, cy + 90, col)
        stroke_rect(px, cx - 90, cy - 70, cx + 90, cy + 90, INK, 2)
        for yy in range(cy - 60, cy + 80, 18):
            line(px, cx - 80, yy, cx + 80, yy, darken(col, 0.75), 1)


def paint_signage(px):
    # faded STEREO-MART exterior / interior sign above listen wall
    cx, cy = uv_px(0.5, 0.22)
    rect(px, cx - 160, cy - 36, cx + 160, cy + 36, mix(STEEL, CHARCOAL, 0.4))
    stroke_rect(px, cx - 160, cy - 36, cx + 160, cy + 36, INK, 2)
    # draw letter blocks (procedural "STEREO-MART")
    letters = "STEREO-MART"
    lx = cx - 140
    for ch in letters:
        if ch == "-":
            rect(px, lx, cy - 2, lx + 10, cy + 2, CONCRETE)
            lx += 14
            continue
        ww = 18 if ch != "M" else 22
        rect(px, lx, cy - 16, lx + ww, cy + 16, mix(CONCRETE, OXIDIZED, 0.4), 200)
        stroke_rect(px, lx, cy - 16, lx + ww, cy + 16, INK, 1)
        lx += ww + 6
    # graffiti tags on brick
    for u, v, col in (
        (0.62, 0.35, GRAFFITI_A),
        (0.15, 0.38, GRAFFITI_B),
        (0.35, 0.33, MOSS),
    ):
        cx, cy = uv_px(u, v)
        for _ in range(40):
            x = cx + RNG.randint(-50, 50)
            y = cy + RNG.randint(-30, 30)
            disk(px, x, y, RNG.randint(1, 3), col, 160)


def paint_utility(px):
    # sticker-covered utility boxes
    for u, v in ((0.38, 0.55), (0.66, 0.56), (0.12, 0.54)):
        cx, cy = uv_px(u, v)
        rect(px, cx - 40, cy - 50, cx + 40, cy + 50, STEEL)
        stroke_rect(px, cx - 40, cy - 50, cx + 40, cy + 50, INK, 2)
        for _ in range(12):
            sx = cx + RNG.randint(-32, 20)
            sy = cy + RNG.randint(-40, 30)
            sw, sh = RNG.randint(10, 22), RNG.randint(8, 16)
            col = RNG.choice([MUTED_BLUE, MOSS, WARM_LAMP, GRAFFITI_B, OXIDIZED])
            rect(px, sx, sy, sx + sw, sy + sh, col, 200)
            stroke_rect(px, sx, sy, sx + sw, sy + sh, INK, 1)
    # telephone poles / overhead wires (drawn as arcs across upper mid)
    for base_u in (0.2, 0.55, 0.85):
        cx, cy = uv_px(base_u, 0.18)
        line(px, cx, cy, cx, cy + 220, darken(STEEL, 0.6), 3)
        disk(px, cx, cy, 8, STEEL_DARK)
    for i in range(8):
        x0 = int((i / 8) * W)
        x1 = x0 + W // 6
        y0 = int(H * 0.16 + 8 * math.sin(i))
        y1 = int(H * 0.18 + 10 * math.cos(i * 1.3))
        # sagging wire
        for t in range(40):
            tt = t / 39
            x = int(x0 + (x1 - x0) * tt)
            sag = int(18 * math.sin(math.pi * tt))
            put(px, x, y0 + sag, INK)


def paint_bikes_crates(px):
    # bicycles leaning on wall
    for u, v in ((0.18, 0.60), (0.70, 0.61)):
        cx, cy = uv_px(u, v)
        stroke_ellipse(px, cx - 30, cy + 20, 22, 22, INK, 2)
        stroke_ellipse(px, cx + 35, cy + 22, 22, 22, INK, 2)
        line(px, cx - 30, cy + 20, cx + 35, cy + 22, STEEL_DARK, 2)
        line(px, cx, cy + 10, cx + 10, cy - 40, INK, 2)
        line(px, cx + 10, cy - 40, cx + 40, cy - 20, INK, 2)
    # milk crates with vinyl near floor front
    for u, v in ((0.42, 0.78), (0.58, 0.79), (0.48, 0.82)):
        cx, cy = uv_px(u, v)
        rect(px, cx - 36, cy - 28, cx + 36, cy + 28, mix(MOSS, CHARCOAL, 0.3))
        stroke_rect(px, cx - 36, cy - 28, cx + 36, cy + 28, INK, 2)
        for i in range(-28, 28, 8):
            line(px, cx - 30, cy + i, cx + 30, cy + i, darken(MOSS, 0.7), 1)
        # vinyl sleeves poking out
        for i in range(5):
            vx = cx - 24 + i * 10
            rect(px, vx, cy - 48, vx + 8, cy - 20, RNG.choice([MUTED_BLUE, WARM_LAMP, GRAFFITI_B, OXIDIZED]))
            stroke_rect(px, vx, cy - 48, vx + 8, cy - 20, INK, 1)


def paint_listen_station(px):
    """Hotspot listening-booth @ u=0.5, v=0.4 — headphones + turntable."""
    cx, cy = uv_px(0.5, 0.4)
    # wooden shelf / booth niche
    rect(px, cx - 140, cy - 150, cx + 140, cy + 160, mix(BRICK_DARK, CHARCOAL, 0.4))
    stroke_rect(px, cx - 140, cy - 150, cx + 140, cy + 160, INK, 3)
    rect(px, cx - 120, cy - 20, cx + 120, cy + 10, darken(CONCRETE, 0.7))
    # turntable
    rect(px, cx - 70, cy + 20, cx + 70, cy + 110, STEEL_DARK)
    stroke_rect(px, cx - 70, cy + 20, cx + 70, cy + 110, INK, 2)
    ellipse_fill(px, cx - 10, cy + 65, 42, 42, CHARCOAL)
    stroke_ellipse(px, cx - 10, cy + 65, 42, 42, INK, 2)
    ellipse_fill(px, cx - 10, cy + 65, 14, 14, mix(WARM_LAMP, CONCRETE, 0.4))
    # tonearm
    line(px, cx + 40, cy + 40, cx + 5, cy + 70, OXIDIZED, 3)
    disk(px, cx + 40, cy + 40, 6, STEEL)
    # headphones hanging
    stroke_ellipse(px, cx, cy - 70, 48, 36, INK, 3)
    rect(px, cx - 55, cy - 90, cx - 35, cy - 50, CHARCOAL)
    rect(px, cx + 35, cy - 90, cx + 55, cy - 50, CHARCOAL)
    stroke_rect(px, cx - 55, cy - 90, cx - 35, cy - 50, INK, 2)
    stroke_rect(px, cx + 35, cy - 90, cx + 55, cy - 50, INK, 2)
    # LISTEN label plate
    rect(px, cx - 40, cy - 130, cx + 40, cy - 108, mix(MUTED_BLUE, CHARCOAL, 0.3))
    stroke_rect(px, cx - 40, cy - 130, cx + 40, cy - 108, INK, 1)


def paint_record_bins(px):
    """Hotspot record-bins island @ u=0.5, v=0.64."""
    cx, cy = uv_px(0.5, 0.64)
    # island base / rug
    ellipse_fill(px, cx, cy + 90, 280, 70, mix(BRICK_DARK, MOSS, 0.35), 200)
    stroke_ellipse(px, cx, cy + 90, 280, 70, INK, 2)
    # three bin units
    for i, ox in enumerate((-160, 0, 160)):
        bx, by = cx + ox, cy
        rect(px, bx - 70, by - 80, bx + 70, by + 60, mix(STEEL, CHARCOAL, 0.25))
        stroke_rect(px, bx - 70, by - 80, bx + 70, by + 60, INK, 3)
        # divider
        line(px, bx, by - 75, bx, by + 55, INK, 2)
        # vinyl tops
        for j in range(10):
            vx = bx - 60 + j * 12
            h = RNG.randint(50, 95)
            col = RNG.choice(
                [MUTED_BLUE, WARM_LAMP, GRAFFITI_B, MOSS, OXIDIZED, mix(CHARCOAL, MUTED_BLUE, 0.4)]
            )
            rect(px, vx, by - h, vx + 9, by - 10, col)
            stroke_rect(px, vx, by - h, vx + 9, by - 10, INK, 1)


def paint_crt(px):
    """Hotspot crt-tv @ u=0.91, v=0.55 — cream/silver CRT on cabinet."""
    cx, cy = uv_px(0.91, 0.55)
    # cabinet
    rect(px, cx - 150, cy - 40, cx + 150, cy + 160, mix(BRICK_DARK, CHARCOAL, 0.5))
    stroke_rect(px, cx - 150, cy - 40, cx + 150, cy + 160, INK, 3)
    # CRT body
    rect(px, cx - 110, cy - 120, cx + 110, cy + 90, mix(CRT_BEZEL, STEEL, 0.4))
    stroke_rect(px, cx - 110, cy - 120, cx + 110, cy + 90, INK, 3)
    # tube glass
    rect(px, cx - 80, cy - 90, cx + 80, cy + 40, mix(WINDOW_NIGHT, MUTED_BLUE, 0.5))
    stroke_rect(px, cx - 80, cy - 90, cx + 80, cy + 40, INK, 2)
    # scanline suggestion
    for yy in range(cy - 88, cy + 38, 4):
        line(px, cx - 78, yy, cx + 78, yy, mix(MUTED_BLUE, OXIDIZED, 0.3), 1)
    # knobs
    for ox in (-70, -40, 40, 70):
        disk(px, cx + ox, cy + 65, 8, OXIDIZED)
        stroke_ellipse(px, cx + ox, cy + 65, 8, 8, INK, 1)
    # stickers on side
    rect(px, cx + 85, cy - 60, cx + 105, cy - 40, WARM_LAMP, 220)
    rect(px, cx + 85, cy - 30, cx + 105, cy - 10, MOSS, 220)


def paint_register_phone(px):
    """cash-register @ 0.31,0.50 and phone @ 0.23,0.51 on counter."""
    # counter surface spanning both
    rcx, rcy = uv_px(0.27, 0.58)
    rect(px, rcx - 220, rcy - 40, rcx + 220, rcy + 80, mix(STEEL_DARK, CHARCOAL, 0.3))
    stroke_rect(px, rcx - 220, rcy - 40, rcx + 220, rcy + 80, INK, 3)
    rect(px, rcx - 210, rcy - 55, rcx + 210, rcy - 35, CONCRETE)
    # register
    cx, cy = uv_px(0.31, 0.50)
    rect(px, cx - 55, cy - 45, cx + 55, cy + 55, REGISTER)
    stroke_rect(px, cx - 55, cy - 45, cx + 55, cy + 55, INK, 2)
    rect(px, cx - 40, cy - 30, cx + 40, cy, mix(WINDOW_NIGHT, MUTED_BLUE, 0.4))
    stroke_rect(px, cx - 40, cy - 30, cx + 40, cy, INK, 1)
    for i in range(3):
        for j in range(3):
            disk(px, cx - 20 + j * 20, cy + 18 + i * 14, 5, STEEL_DARK)
    # drawer line
    line(px, cx - 50, cy + 40, cx + 50, cy + 40, INK, 2)
    # rotary phone
    px_, py_ = uv_px(0.23, 0.51)
    ellipse_fill(px, px_, py_ + 10, 55, 35, PHONE_BLACK)
    stroke_ellipse(px, px_, py_ + 10, 55, 35, INK, 2)
    ellipse_fill(px, px_, py_ - 15, 38, 28, mix(PHONE_BLACK, STEEL_DARK, 0.3))
    stroke_ellipse(px, px_, py_ - 15, 38, 28, INK, 2)
    # dial holes
    for ang in range(0, 360, 40):
        rad = math.radians(ang)
        disk(
            px,
            int(px_ + math.cos(rad) * 22),
            int(py_ - 15 + math.sin(rad) * 16),
            4,
            OXIDIZED,
        )
    # handset
    rect(px, px_ - 50, py_ - 45, px_ + 50, py_ - 28, PHONE_BLACK)
    stroke_rect(px, px_ - 50, py_ - 45, px_ + 50, py_ - 28, INK, 1)
    disk(px, px_ - 50, py_ - 36, 12, PHONE_BLACK)
    disk(px, px_ + 50, py_ - 36, 12, PHONE_BLACK)


def paint_plants_posters(px):
    # plant by listen (owl toy zone)
    cx, cy = uv_px(0.44, 0.42)
    rect(px, cx - 18, cy + 40, cx + 18, cy + 100, mix(BRICK, CONCRETE, 0.4))
    stroke_rect(px, cx - 18, cy + 40, cx + 18, cy + 100, INK, 1)
    for _ in range(25):
        disk(
            px,
            cx + RNG.randint(-40, 40),
            cy + RNG.randint(-80, 30),
            RNG.randint(8, 18),
            mix(MOSS, darken(MOSS, 0.7), RNG.random()),
            200,
        )
    # plant by CRT
    cx, cy = uv_px(0.94, 0.58)
    for _ in range(20):
        disk(
            px,
            cx + RNG.randint(-35, 35),
            cy + RNG.randint(-70, 40),
            RNG.randint(7, 16),
            mix(MOSS, MUTED_BLUE, 0.2),
            190,
        )
    # poster above listen
    cx, cy = uv_px(0.5, 0.28)
    rect(px, cx - 45, cy - 45, cx + 45, cy + 45, mix(WARM_LAMP, CONCRETE, 0.35))
    stroke_rect(px, cx - 45, cy - 45, cx + 45, cy + 45, INK, 2)
    rect(px, cx - 30, cy - 25, cx + 30, cy + 25, mix(MUTED_BLUE, CHARCOAL, 0.4))


def paint_loading_dock_interior(px):
    # dock door suggestion left of register
    cx, cy = uv_px(0.12, 0.48)
    rect(px, cx - 100, cy - 160, cx + 100, cy + 140, mix(STEEL_DARK, CHARCOAL, 0.5))
    stroke_rect(px, cx - 100, cy - 160, cx + 100, cy + 140, INK, 3)
    for yy in range(cy - 150, cy + 130, 16):
        line(px, cx - 90, yy, cx + 90, yy, darken(STEEL, 0.65), 1)
    # exterior staircase through a small side window
    paint_window(px, 0.60, 0.38, 140, 200)


def build_layers(base: Image.Image):
    """Sparse transparent FG/MG plates for subtle parallax spheres."""
    OUT_FG.parent.mkdir(parents=True, exist_ok=True)
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fpx = fg.load()
    mpx = mg.load()

    def put_a(pix, x, y, rgb, a):
        if y < 0 or y >= H:
            return
        x = wrap_x(x)
        pix[x, y] = (*rgb, a)

    # Midground: hanging wires + distant crates silhouette
    for i in range(12):
        x0 = int((i / 12) * W)
        for t in range(50):
            tt = t / 49
            x = int(x0 + 200 * tt)
            sag = int(22 * math.sin(math.pi * tt))
            put_a(mpx, x, int(H * 0.2) + sag, INK, 110)

    # Foreground: near milk crates / vinyl edge at bottom
    for u in (0.35, 0.5, 0.65):
        cx, cy = uv_px(u, 0.88)
        for dy in range(-40, 50):
            for dx in range(-50, 50):
                if abs(dx) < 48 and abs(dy) < 40:
                    put_a(fpx, cx + dx, cy + dy, mix(MOSS, CHARCOAL, 0.4), 90)

    fg = fg.filter(ImageFilter.GaussianBlur(0.8))
    mg = mg.filter(ImageFilter.GaussianBlur(1.2))
    fg.save(OUT_FG, "PNG", optimize=True)
    mg.save(OUT_MG, "PNG", optimize=True)
    return fg, mg


def write_direction():
    DIR_NOTE.write_text(
        """# Stereo-Mart v18 — warehouse editorial (Balming Tiger UX, own identity)

## Direction
Immersive full-screen exhibition — not a traditional site.
Primary UX/motion reference: balmingtiger.com (conveyor nav, glass panels, enter gate, diegetic hotspots).
Visual identity: underground PNW industrial record shop — **not** BT cream cartoon room.

## Illustration
Semi-realistic hand-drawn equirect of a converted warehouse:
weathered brick, corrugated steel, loading docks, rooftop HVAC, exterior stairs,
graffiti, faded STEREO-MART signage, moss, cracked pavement, puddles,
shipping containers, bicycles, milk crates of vinyl, stickered utility boxes,
telephone poles, overhead wires.

Palette: charcoal · cool grey · oxidized silver · muted blue · concrete beige · moss green.

## Hotspot UV blueprint (preserved)
| id | u | v |
|---|---|---|
| listening-booth | 0.50 | 0.40 |
| crt-tv | 0.91 | 0.55 |
| record-bins | 0.50 | 0.64 |
| cash-register | 0.31 | 0.50 |
| phone-booth | 0.23 | 0.51 |

## Bake
```bash
python3 scripts/paint-stereo-mart-v18-warehouse.py
python3 scripts/build-v18-pano.py
```
""",
        encoding="utf-8",
    )


def main():
    print("Painting v18 warehouse equirect…")
    img = Image.new("RGB", (W, H), CHARCOAL)
    px = img.load()

    paint_ceiling(px)
    paint_walls(px)
    paint_floor(px)
    paint_exterior_district(px)
    paint_loading_dock_interior(px)
    paint_signage(px)
    paint_utility(px)
    paint_bikes_crates(px)
    paint_plants_posters(px)
    # Heroes last so silhouettes stay crisp for edge masks
    paint_listen_station(px)
    paint_record_bins(px)
    paint_crt(px)
    paint_register_phone(px)

    # Atmospheric vignette
    a = np.asarray(img).astype(np.float32)
    ys = np.linspace(-1, 1, H)[:, None]
    xs = np.linspace(-1, 1, W)[None, :]
    # soft vertical falloff (floor darker, ceiling cooler)
    a *= (0.88 + 0.12 * (1 - np.abs(ys)))[..., None]
    # cool grade
    a[..., 0] *= 0.96
    a[..., 2] = np.clip(a[..., 2] * 1.04, 0, 255)
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

    img = ink_edge(img)
    img = paper_grain(img, 0.05)
    # slight film grain / scanline weave
    arr = np.asarray(img).astype(np.float32)
    scan = (np.arange(H)[:, None] % 3 == 0).astype(np.float32) * 4.0
    arr[..., 1] = np.clip(arr[..., 1] - scan * 0.35, 0, 255)
    arr[..., 2] = np.clip(arr[..., 2] - scan * 0.2, 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))

    # wrap seam blend
    band = 64
    left = np.asarray(img.crop((0, 0, band, H))).astype(np.float32)
    right = np.asarray(img.crop((W - band, 0, W, H))).astype(np.float32)
    full = np.asarray(img).astype(np.float32)
    for i in range(band):
        t = i / band
        full[:, i] = right[:, i] * (1 - t) + full[:, i] * t
        full[:, W - band + i] = full[:, W - band + i] * (1 - t) + left[:, i] * t
    img = Image.fromarray(np.clip(full, 0, 255).astype(np.uint8))

    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Color(img).enhance(0.92)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({img.size})")
    build_layers(img)
    print(f"Wrote layers {OUT_FG.name}, {OUT_MG.name}")
    write_direction()
    print(f"Wrote {DIR_NOTE}")


if __name__ == "__main__":
    main()
