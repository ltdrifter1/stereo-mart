#!/usr/bin/env python3
"""
Composite the high-detail editorial illustration into a 2:1 equirect master,
preserving Stereo-Mart hotspot UV anchors via careful centering + side fill.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
REF = Path("/opt/cursor/artifacts/assets/stereo-mart-v18-ref-editorial.png")
# Fallback if artifact path differs
REF_CANDIDATES = [
    REF,
    ROOT / "art" / "refs" / "stereo-mart-v18-ref-editorial.png",
    ROOT / "art" / "stereo-mart-equirect-warehouse-v18.png",
]
PROCEDURAL = ROOT / "art" / "stereo-mart-equirect-warehouse-v18.png"
OUT = ROOT / "art" / "stereo-mart-equirect-warehouse-v18.png"
OUT_REF = ROOT / "art" / "refs" / "stereo-mart-v18-ref-editorial.png"

W, H = 2048, 1024


def find_ref() -> Path:
    for p in REF_CANDIDATES:
        if p.exists():
            return p
    raise SystemExit("no reference illustration found")


def seam_blend(img: Image.Image, band: int = 48) -> Image.Image:
    full = np.asarray(img).astype(np.float32)
    left = full[:, :band].copy()
    right = full[:, -band:].copy()
    for i in range(band):
        t = i / band
        full[:, i] = right[:, i] * (1 - t) + full[:, i] * t
        full[:, W - band + i] = full[:, W - band + i] * (1 - t) + left[:, i] * t
    return Image.fromarray(np.clip(full, 0, 255).astype(np.uint8))


def paper_grade(img: Image.Image) -> Image.Image:
    a = np.asarray(img).astype(np.float32)
    rng = np.random.default_rng(18)
    grain = (rng.random(a.shape[:2]) - 0.5) * 10
    a[..., 0] = np.clip(a[..., 0] + grain * 0.9 - 2, 0, 255)
    a[..., 1] = np.clip(a[..., 1] + grain * 0.85, 0, 255)
    a[..., 2] = np.clip(a[..., 2] + grain * 0.8 + 2, 0, 255)
    # subtle cool grade
    a[..., 0] *= 0.98
    a[..., 2] = np.clip(a[..., 2] * 1.03, 0, 255)
    out = Image.fromarray(a.astype(np.uint8))
    out = ImageEnhance.Contrast(out).enhance(1.06)
    out = ImageEnhance.Color(out).enhance(0.94)
    return out


def main():
    ref_path = find_ref()
    print(f"ref: {ref_path}")
    ref = Image.open(ref_path).convert("RGB")
    OUT_REF.parent.mkdir(parents=True, exist_ok=True)
    if ref_path != OUT_REF:
        ref.save(OUT_REF, "PNG", optimize=True)

    # Scale ref to full height, keep aspect
    scale = H / ref.height
    rw = int(ref.width * scale)
    ref_r = ref.resize((rw, H), Image.Resampling.LANCZOS)

    # Base: procedural warehouse stretched to 2:1 (side atmosphere)
    if PROCEDURAL.exists() and PROCEDURAL.resolve() != OUT.resolve():
        base = Image.open(PROCEDURAL).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    else:
        # synthesize cool brick fill from ref edges
        base = Image.new("RGB", (W, H), (32, 34, 36))
        edge = ImageOps.mirror(ref_r.crop((0, 0, min(200, rw), H)))
        for x in range(0, W, edge.width):
            base.paste(edge.resize((min(edge.width, W - x), H)), (x, 0))
        base = base.filter(ImageFilter.GaussianBlur(8))
        base = ImageEnhance.Brightness(base).enhance(0.55)

    canvas = base.copy()

    # Center the editorial plate so listen wall / bins sit near u=0.5
    ox = (W - rw) // 2
    # Soft-edge mask so procedural sides blend
    canvas.paste(ref_r, (ox, 0))
    if ox > 0:
        fade = 96
        arr = np.asarray(canvas).astype(np.float32)
        left_edge = np.asarray(ref_r.crop((0, 0, fade, H))).astype(np.float32)
        right_edge = np.asarray(ref_r.crop((rw - fade, 0, rw, H))).astype(np.float32)
        base_arr = np.asarray(base).astype(np.float32)
        for i in range(fade):
            t = i / fade
            # left blend zone
            x = ox + i
            if 0 <= x < W:
                arr[:, x] = base_arr[:, x] * (1 - t) + arr[:, x] * t
            # extend mirrored fill into side gutters
            gx = ox - fade + i
            if 0 <= gx < ox:
                arr[:, gx] = base_arr[:, gx] * (1 - t) + left_edge[:, fade - 1 - i] * t * 0.85 + base_arr[:, gx] * (
                    1 - 0.85 * t
                )
            # right
            x = ox + rw - fade + i
            if 0 <= x < W:
                arr[:, x] = arr[:, x] * (1 - t) + base_arr[:, x] * t
            gx = ox + rw + i
            if ox + rw <= gx < W:
                arr[:, gx] = base_arr[:, gx] * t + right_edge[:, i] * (1 - t) * 0.85 + base_arr[:, gx] * (
                    1 - 0.85 * (1 - t)
                )
        canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    canvas = seam_blend(canvas, 56)
    canvas = paper_grade(canvas)
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    # File-space mirrors authored UV (texture.repeat.x = -1): CRT on file-left.
    canvas = ImageOps.mirror(canvas)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} {canvas.size} (UV-mirrored)")


if __name__ == "__main__":
    main()
