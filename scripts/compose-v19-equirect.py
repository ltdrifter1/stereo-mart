#!/usr/bin/env python3
"""
Compose Stereo-Mart v19 cartoon warehouse equirect master.

Source plate: late-90s JP game-manual / PS2-concept ink illustration
(art/refs/stereo-mart-v19-cartoon-ink-a.png). Preserves hotspot UV
anchors used by app/data/sections.ts via centering + UV mirror.

Also builds richer transparent FG/MG parallax plates from keyed prop art.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "art" / "refs" / "stereo-mart-v19-cartoon-ink-a.png"
REF_CANDIDATES = [
    Path("/opt/cursor/artifacts/assets/stereo-mart-v19-cartoon-ink-a.png"),
    REF,
]
FG_SRC = ROOT / "art" / "refs" / "stereo-mart-v19-fg-props.png"
MG_SRC = ROOT / "art" / "refs" / "stereo-mart-v19-mg-props.png"
OUT = ROOT / "art" / "stereo-mart-equirect-cartoon-v19.png"
OUT_FG = ROOT / "art" / "layers" / "warehouse-fg-v19.png"
OUT_MG = ROOT / "art" / "layers" / "warehouse-mg-v19.png"
OUT_REF = ROOT / "art" / "refs" / "stereo-mart-v19-cartoon-ink-a.png"

W, H = 2048, 1024


def find_ref() -> Path:
    for p in REF_CANDIDATES:
        if p.exists():
            return p
    raise SystemExit("v19 cartoon ink plate not found")


def seam_blend(img: Image.Image, band: int = 56) -> Image.Image:
    full = np.asarray(img).astype(np.float32)
    left = full[:, :band].copy()
    right = full[:, -band:].copy()
    for i in range(band):
        t = i / band
        full[:, i] = right[:, i] * (1 - t) + full[:, i] * t
        full[:, W - band + i] = full[:, W - band + i] * (1 - t) + left[:, i] * t
    return Image.fromarray(np.clip(full, 0, 255).astype(np.uint8))


def cool_cartoon_grade(img: Image.Image) -> Image.Image:
    """Lift midtones for manual-page readability while keeping cool PNW grade."""
    a = np.asarray(img).astype(np.float32)
    # Lift shadows gently — target mean ~65–75
    a = np.clip(a * 1.12 + 8.0, 0, 255)
    rng = np.random.default_rng(19)
    grain = (rng.random(a.shape[:2]) - 0.5) * 9
    a[..., 0] = np.clip(a[..., 0] + grain * 0.85 - 4, 0, 255)  # cool red pull
    a[..., 1] = np.clip(a[..., 1] + grain * 0.9 + 1, 0, 255)
    a[..., 2] = np.clip(a[..., 2] + grain * 0.8 + 5, 0, 255)  # muted blue push
    out = Image.fromarray(a.astype(np.uint8))
    out = ImageEnhance.Contrast(out).enhance(1.08)
    out = ImageEnhance.Color(out).enhance(0.92)
    out = ImageEnhance.Sharpness(out).enhance(1.15)
    return out


def key_void_to_alpha(img: Image.Image, luma_thresh: float = 28.0) -> Image.Image:
    """Turn near-black void / checker-adjacent dark into transparency."""
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    rgb = arr[..., :3]
    luma = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    # Also treat near-uniform dark as void
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    void = (luma < luma_thresh) & (spread < 18)
    alpha = np.where(void, 0.0, 255.0)
    # Soft edge
    soft = (luma < luma_thresh + 18) & ~void
    alpha = np.where(soft, np.clip((luma - luma_thresh) / 18.0 * 255.0, 0, 255), alpha)
    arr[..., 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def place_layer(
    keyed: Image.Image,
    canvas_size: tuple[int, int],
    *,
    scale: float,
    anchor_uv: tuple[float, float],
    opacity: float = 1.0,
) -> Image.Image:
    """Paste a keyed plate so its content centroid lands near authored UV."""
    W0, H0 = canvas_size
    layer = Image.new("RGBA", (W0, H0), (0, 0, 0, 0))
    src = keyed.copy()
    nw = max(1, int(src.width * scale))
    nh = max(1, int(src.height * scale))
    src = src.resize((nw, nh), Image.Resampling.LANCZOS)
    if opacity < 1.0:
        a = np.asarray(src).astype(np.float32)
        a[..., 3] *= opacity
        src = Image.fromarray(a.astype(np.uint8), "RGBA")

    # Content bbox for centering
    alpha = np.asarray(src.split()[-1])
    ys, xs = np.where(alpha > 20)
    if len(xs) == 0:
        return layer
    cx = int(xs.mean())
    cy = int(ys.mean())
    tx = int(anchor_uv[0] * W0) - cx
    ty = int(anchor_uv[1] * H0) - cy
    layer.alpha_composite(src, (tx, ty))
    return layer


def build_parallax_layers(master_rgb: Image.Image) -> tuple[Image.Image, Image.Image]:
    """
    FG: near crates / lamps keyed from FG plate + bottom vignette from master.
    MG: mid furniture keyed from MG plate, lightly opacity-blended.
    """
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mg = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    if FG_SRC.exists():
        fg_keyed = key_void_to_alpha(Image.open(FG_SRC), luma_thresh=34)
        # Crates sit low-center; lamps near top-center of authored view
        fg.alpha_composite(
            place_layer(fg_keyed, (W, H), scale=0.72, anchor_uv=(0.50, 0.82), opacity=0.92)
        )
        # Duplicate a softer copy slightly offset for wrap richness
        fg.alpha_composite(
            place_layer(fg_keyed, (W, H), scale=0.45, anchor_uv=(0.12, 0.78), opacity=0.55)
        )

    if MG_SRC.exists():
        mg_keyed = key_void_to_alpha(Image.open(MG_SRC), luma_thresh=22)
        # Island bins + headphones near center; CRT / counter to sides
        mg.alpha_composite(
            place_layer(mg_keyed, (W, H), scale=0.58, anchor_uv=(0.50, 0.52), opacity=0.48)
        )

    # Soft floor strip from master for FG depth (bottom band)
    master = master_rgb.convert("RGBA")
    marr = np.asarray(master).astype(np.float32)
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    floor_a = np.clip((y - 0.72) / 0.22, 0, 1) * 140
    floor = marr.copy()
    floor[..., 3] = floor_a
    # Keep only slightly darker/nearer looking pixels
    fg_floor = Image.fromarray(floor.astype(np.uint8), "RGBA")
    fg.alpha_composite(fg_floor)

    # Soft ceiling ducts strip for MG
    ceil_a = np.clip((0.22 - y) / 0.22, 0, 1) * 90
    ceil = marr.copy()
    ceil[..., 3] = ceil_a
    mg.alpha_composite(Image.fromarray(ceil.astype(np.uint8), "RGBA"))

    return fg, mg


def extract_hotspot_props():
    """Crop individual props from the v19 sheet into art/props/."""
    sheet_path = ROOT / "art" / "refs" / "stereo-mart-v19-hotspot-props.png"
    alt = Path("/opt/cursor/artifacts/assets/stereo-mart-v19-hotspot-props.png")
    if not sheet_path.exists() and alt.exists():
        sheet_path.parent.mkdir(parents=True, exist_ok=True)
        Image.open(alt).save(sheet_path)
    if not sheet_path.exists():
        print("skip prop extract — sheet missing")
        return

    sheet = Image.open(sheet_path).convert("RGB")
    keyed = key_void_to_alpha(sheet, luma_thresh=18)
    arr = np.asarray(keyed)
    alpha = arr[..., 3]
    # Connected-ish crops via simple quadrant splits matching the sheet layout:
    # TL CRT, TR bins, BL headphones, BC register, BR phone
    h, w = alpha.shape
    boxes = {
        "crt.png": (0.02, 0.02, 0.48, 0.48),
        "bins.png": (0.48, 0.02, 0.98, 0.52),
        "listen.png": (0.02, 0.52, 0.38, 0.98),
        "register.png": (0.32, 0.50, 0.68, 0.98),
        "phone.png": (0.66, 0.52, 0.98, 0.98),
    }
    out_dir = ROOT / "art" / "props"
    out_dir.mkdir(parents=True, exist_ok=True)
    pub = ROOT / "public" / "hotspots" / "props"
    pub.mkdir(parents=True, exist_ok=True)
    for name, (u0, v0, u1, v1) in boxes.items():
        x0, y0 = int(u0 * w), int(v0 * h)
        x1, y1 = int(u1 * w), int(v1 * h)
        crop = keyed.crop((x0, y0, x1, y1))
        # Trim to content
        ca = np.asarray(crop.split()[-1])
        ys, xs = np.where(ca > 16)
        if len(xs):
            crop = crop.crop(
                (
                    max(0, xs.min() - 4),
                    max(0, ys.min() - 4),
                    min(crop.width, xs.max() + 5),
                    min(crop.height, ys.max() + 5),
                )
            )
        crop.save(out_dir / name, "PNG", optimize=True)
        crop.save(pub / name, "PNG", optimize=True)
        print(f"  prop {name} {crop.size}")


def main():
    ref_path = find_ref()
    print(f"ref: {ref_path}")
    ref = Image.open(ref_path).convert("RGB")
    OUT_REF.parent.mkdir(parents=True, exist_ok=True)
    if ref_path.resolve() != OUT_REF.resolve():
        ref.save(OUT_REF, "PNG", optimize=True)

    scale = H / ref.height
    rw = int(ref.width * scale)
    ref_r = ref.resize((rw, H), Image.Resampling.LANCZOS)

    # Cool brick side atmosphere from mirrored edges
    base = Image.new("RGB", (W, H), (36, 40, 44))
    edge = ImageOps.mirror(ref_r.crop((0, 0, min(220, rw), H)))
    for x in range(0, W, edge.width):
        base.paste(edge.resize((min(edge.width, W - x), H)), (x, 0))
    base = base.filter(ImageFilter.GaussianBlur(10))
    base = ImageEnhance.Brightness(base).enhance(0.62)

    canvas = base.copy()
    ox = (W - rw) // 2
    canvas.paste(ref_r, (ox, 0))

    if ox > 0:
        fade = 100
        arr = np.asarray(canvas).astype(np.float32)
        left_edge = np.asarray(ref_r.crop((0, 0, fade, H))).astype(np.float32)
        right_edge = np.asarray(ref_r.crop((rw - fade, 0, rw, H))).astype(np.float32)
        base_arr = np.asarray(base).astype(np.float32)
        for i in range(fade):
            t = i / fade
            x = ox + i
            if 0 <= x < W:
                arr[:, x] = base_arr[:, x] * (1 - t) + arr[:, x] * t
            gx = ox - fade + i
            if 0 <= gx < ox:
                arr[:, gx] = (
                    base_arr[:, gx] * (1 - 0.8 * t)
                    + left_edge[:, fade - 1 - i] * 0.8 * t
                )
            x = ox + rw - fade + i
            if 0 <= x < W:
                arr[:, x] = arr[:, x] * (1 - t) + base_arr[:, x] * t
            gx = ox + rw + i
            if ox + rw <= gx < W:
                arr[:, gx] = (
                    base_arr[:, gx] * (1 - 0.8 * (1 - t))
                    + right_edge[:, i] * 0.8 * (1 - t)
                )
        canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    canvas = seam_blend(canvas, 56)
    canvas = cool_cartoon_grade(canvas)
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))
    # ink-a plate already has CRT on visual-left / register on visual-right,
    # which matches file-space after texture.repeat.x = -1 (authored u → 1−file_u).
    # Do NOT mirror — v18 refs needed a flip; v19 cartoon plate does not.

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, "PNG", optimize=True)
    mean = float(np.asarray(canvas).mean())
    print(f"wrote {OUT} {canvas.size} meanL={mean:.1f} (file-space, no UV mirror)")

    fg, mg = build_parallax_layers(canvas)
    # Layers share the same file-space as the master (no mirror).
    OUT_FG.parent.mkdir(parents=True, exist_ok=True)
    fg.save(OUT_FG, "PNG", optimize=True)
    mg.save(OUT_MG, "PNG", optimize=True)
    fa = np.asarray(fg.split()[-1])
    ma = np.asarray(mg.split()[-1])
    print(
        f"layers FG opaque={(fa > 10).mean()*100:.2f}%  "
        f"MG opaque={(ma > 10).mean()*100:.2f}%"
    )

    print("extracting hotspot props…")
    extract_hotspot_props()


if __name__ == "__main__":
    main()
