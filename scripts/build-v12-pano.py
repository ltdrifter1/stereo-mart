#!/usr/bin/env python3
"""
V15 panorama production bake — STEREO-MART late-90s analog shop redraw
(same hotspot anchors as v11/v12).

Input : art/stereo-mart-pano-v12-src.png  (prefer 4096x2048 / 2:1 equirect:
        warm VHS/cassette shop after closing — muted teal, cream, burgundy,
        olive, tobacco, warm fluorescent; seam-safe heroes; same landmarks)
Output: public/textures/store_pano_v12.webp        4096x2048 lights-on
        public/textures/store_pano_off_v12.webp    4096x2048 lights-off grade
        public/textures/store_pano_lqip_v12.webp   512x256 preview
        public/hotspots/<id>_edge.webp            silhouette rim masks
        public/hotspots/crt_frame.webp            bezel overlay (tube hole)
        public/hotspots/crt_backing_off.webp      dark tube (focused, no video)
        public/hotspots/crt_backing_playing.webp  black tube behind video

Masks and CRT overlays are generated in gnomonically projected plane space —
the exact billboard footprint Hotspot.tsx / CrtScreen.tsx render — so they
line up with the pano at any plane size (the LISTEN tower spans ~77°).

Segmentation: cel ink outlines close every object, so background is whatever
a flood fill from the crop border can reach without crossing an ink line.

Run: python3 scripts/build-v12-pano.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "stereo-mart-pano-v12-src.png"
OUT_ON = ROOT / "public" / "textures" / "store_pano_v12.webp"
OUT_OFF = ROOT / "public" / "textures" / "store_pano_off_v12.webp"
OUT_LQIP = ROOT / "public" / "textures" / "store_pano_lqip_v12.webp"
OUT_PNG = ROOT / "public" / "textures" / "store_pano_v12.png"
HOTSPOT_DIR = ROOT / "public" / "hotspots"

W, H = 4096, 2048
SEAM_BAND = 128  # px cross-faded across the wrap seam
# Accepted illustration masters (prefer true 2:1 equirect).
SRC_SIZES = {(2048, 1024), (1536, 1024), (4096, 2048)}

# Hotspot glow planes — MUST mirror app/data/sections.ts
# (u, v, glowW ?? w, glowH ?? h). Edge masks are drawn in projected space.
PLANES = {
    # Far back wall LISTEN — headphones + turntable (file ≈ x 720–900)
    "listening-booth": (0.470, 0.355, 16.0, 18.0),
    "crt-tv": (0.909, 0.523, 24.0, 20.0),
    # Island bins on the moss rug — overview glow, not face-plant
    "record-bins": (0.492, 0.600, 30.0, 20.0),
    # Cream cash register body ONLY — not shelves behind
    "cash-register": (0.223, 0.450, 9.0, 7.5),
    "phone-booth": (0.148, 0.470, 10.0, 7.0),
}
# CRT hit plane (sections.ts w/h) — chassis footprint for the overlay stack.
CRT_PLANE = (0.909, 0.523, 20.0, 18.0)
# Painted glass inside that footprint — MUST mirror CrtScreen.tsx.
CRT_SCREEN_W_FAC = 0.7
CRT_SCREEN_H_FAC = 0.68
CRT_SCREEN_OX = 0.35
CRT_SCREEN_OY = -0.55
CRT_FRAME_W_FAC = 0.95
CRT_FRAME_H_FAC = 0.92
# File-space chassis crop on the equirect source (bezel + stickers + tapes).
# Coordinates are normalised against the master width/height inside crt_overlays.
CRT_FILE_BOX_NORM = (0.03, 0.39, 0.17, 0.65)  # analog CRT chassis on 2:1 master

# Ambient toy sprites — alpha-cut object billboards that wiggle on click.
# MUST mirror the `toy` planes in app/components/AmbientHits.tsx.
# Modes: dark = near-black object on lighter bg (headphones);
#        flood = ink-closed standalone object (plant stand);
#        patch = soft rounded-rect crop (flat floor objects like the mat).
TOY_SPRITES = {
    "stool": (0.499, 0.352, 10.0, 12.0, "flood"),  # headphones on back wall
    "owl": (0.564, 0.371, 14.0, 20.0, "flood"),  # plant by LISTEN wall
    "cushion": (0.492, 0.742, 22.0, 10.0, "patch"),  # milk-crate cluster / rug front
    "crate": (0.830, 0.560, 14.0, 14.0, "flood"),  # plant + cabinet by CRT
    "poster": (0.499, 0.275, 10.0, 10.0, "patch"),  # blank yellow square above headphones
    "fire": (0.495, 0.700, 20.0, 12.0, "patch"),  # moss rug pool
    "wonder": (0.772, 0.450, 16.0, 20.0, "patch"),  # storefront window / street
}
MASK_PLANE_RADIUS = 47.5  # SPHERE_RADIUS - 0.5 (Hotspot.tsx)
CRT_PLANE_RADIUS = 47.2  # SPHERE_RADIUS - 0.8 (CrtScreen.tsx)

# Ink-flood tuning per target:
# (ink luminance threshold, opening iterations, color-refine against bg refs)
# Opening must exceed half the ink-line width in mask space (~30px for the
# tight phone/CRT projections) to drop stray outline tails; color refine
# subtracts wood/cream interiors (counter corner, cabinet top) that the
# flood ropes in via connected ink. The register stays color-refine-free —
# its cream body matches the cream wall.
# Register refine is OFF in v9: its cream body matches the cream wall again.
SEG = {
    "listening-booth": (90, 4, False),
    # Dark purple room + silver CRT: lower ink thr so bezel outlines register
    # without swallowing the glowing tube (thr≥65 collapses the silhouette).
    "crt-tv": (55, 4, False),
    "record-bins": (120, 8, True),
    "cash-register": (120, 6, False),
    "phone-booth": (70, 3, False),
}

# Background samples for color refine — normalised later against source size.
BG_POINTS_NORM = (
    (0.81, 0.35),
    (0.04, 0.34),
    (0.61, 0.46),
    (0.72, 0.55),
    (0.26, 0.78),
    (0.42, 0.62),
    (0.13, 0.56),
    (0.50, 0.27),
    (0.33, 0.88),
    (0.20, 0.20),
    (0.91, 0.24),
)

# Lamp / fluorescent pools for lights-off grade (file-space u/v, warm yellow).
LAMP_POOLS = (
    (0.28, 0.14, 0.16, 0.5),  # warm fluorescent left
    (0.55, 0.14, 0.16, 0.5),  # warm fluorescent center
    (0.78, 0.15, 0.14, 0.45),  # warm fluorescent right
    (0.50, 0.30, 0.12, 0.35),  # listen wall
    (0.09, 0.52, 0.12, 0.4),  # CRT idle glow
    (0.30, 0.45, 0.14, 0.3),  # storefront spill
)


def bake_pano() -> Image.Image:
    src = Image.open(SRC).convert("RGB")
    if src.size not in SRC_SIZES:
        raise SystemExit(f"unexpected source size {src.size}; expected one of {sorted(SRC_SIZES)}")

    pano = src.resize((W, H), Image.Resampling.LANCZOS)
    # Two-pass unsharp keeps the clean ink lines crisp after upscale.
    pano = pano.filter(ImageFilter.UnsharpMask(radius=1.8, percent=85, threshold=2))
    pano = pano.filter(ImageFilter.UnsharpMask(radius=3.6, percent=32, threshold=3))

    # Wrap band: cross-fade left/right edges so u=0 joins u=1 seamlessly.
    arr = np.asarray(pano).astype(np.float32)
    band = SEAM_BAND
    left = arr[:, :band].copy()
    right = arr[:, -band:].copy()
    t = (np.arange(band, dtype=np.float32) / (band - 1))[None, :, None]
    blend = right * (1 - t) + left * t
    half = band // 2
    arr[:, :half] = blend[:, half:]
    arr[:, -half:] = blend[:, :half]
    return Image.fromarray(arr.astype(np.uint8))


def lights_off(pano: Image.Image) -> Image.Image:
    """Night grade: cool, dark, faint pools under the hanging lamps."""
    a = np.asarray(pano).astype(np.float32) / 255.0

    dark = a ** 1.2
    dark[..., 0] *= 0.4
    dark[..., 1] *= 0.45
    dark[..., 2] *= 0.62

    yy, xx = np.mgrid[0 : pano.height, 0 : pano.width].astype(np.float32)
    warm = np.zeros_like(a)
    for fu, fv, radius, gain in LAMP_POOLS:
        cx, cy = fu * pano.width, fv * pano.height
        d2 = ((xx - cx) / (radius * pano.width)) ** 2 + (
            (yy - cy) / (radius * pano.width)
        ) ** 2
        glow = np.exp(-d2)[..., None] * gain
        warm += glow * np.array([1.0, 0.82, 0.48])[None, None, :]

    out = np.clip(dark + warm * a * 0.9, 0, 1)
    return Image.fromarray((out * 255).astype(np.uint8))


def plane_basis(u: float, v: float, radius: float):
    """Billboard basis matching uvToSpherical + lookAt(origin).

    three.js Object3D.lookAt points a non-camera's +z AT the target, so the
    plane's +z faces the origin and textures read in file space (verified:
    v6 file-space crops rendered un-mirrored on these billboards).
    """
    yaw = (u - 0.5) * np.pi * 2 - np.pi / 2
    pitch = (0.5 - v) * np.pi
    cp, sp = np.cos(pitch), np.sin(pitch)
    sy, cy = np.sin(yaw), np.cos(yaw)
    center = np.array([-sy * cp, sp, -cy * cp]) * radius
    z_ax = -center / np.linalg.norm(center)
    x_ax = np.cross(np.array([0.0, 1.0, 0.0]), z_ax)
    x_ax /= np.linalg.norm(x_ax)
    y_ax = np.cross(z_ax, x_ax)
    return center, x_ax, y_ax


def project_pano_to_plane(
    pano: np.ndarray,
    u: float,
    v: float,
    pw: float,
    ph: float,
    radius: float,
    tex_w: int,
    tex_h: int,
) -> np.ndarray:
    """Sample the pano along rays through every texel of the billboard plane."""
    center, x_ax, y_ax = plane_basis(u, v, radius)
    mu = (np.arange(tex_w) + 0.5) / tex_w
    mv = (np.arange(tex_h) + 0.5) / tex_h
    gu, gv = np.meshgrid(mu, mv)
    lx = (gu - 0.5) * pw
    ly = (0.5 - gv) * ph
    pos = center[None, None, :] + lx[..., None] * x_ax + ly[..., None] * y_ax
    d = pos / np.linalg.norm(pos, axis=-1, keepdims=True)

    theta = np.arccos(np.clip(d[..., 1], -1, 1))
    st = np.maximum(np.sin(theta), 1e-9)
    phi = np.mod(np.arctan2(d[..., 2] / st, -d[..., 0] / st), 2 * np.pi)
    file_u = np.mod(1 - phi / (2 * np.pi), 1)
    file_v = theta / np.pi

    h, w = pano.shape[:2]
    px = np.clip((file_u * w).astype(np.int32), 0, w - 1)
    py = np.clip((file_v * h).astype(np.int32), 0, h - 1)
    return pano[py, px]


def edge_mask(pano_arr: np.ndarray, sid: str) -> Image.Image:
    """Silhouette rim in billboard space via ink-outline flood segmentation."""
    u, v, pw, ph = PLANES[sid]
    scale = 1024 / max(pw, ph)
    tw = max(2, round(pw * scale))
    th = max(2, round(ph * scale))
    crop = project_pano_to_plane(
        pano_arr, u, v, pw, ph, MASK_PLANE_RADIUS, tw, th
    ).astype(np.float32)

    ink_thr, open_iters, color_refine = SEG[sid]
    lum = crop.max(axis=2)
    ink = lum < ink_thr
    # Slight dilation seals anti-aliased line gaps before flooding.
    ink = ndimage.binary_dilation(ink, iterations=1)

    # Background = reachable from the crop border without crossing ink.
    free = ~ink
    labels, _ = ndimage.label(free)
    border_labels = np.unique(
        np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    )
    bg = np.isin(labels, border_labels[border_labels != 0])
    obj = ~bg

    if color_refine:
        # Drop wall/wood interiors the flood roped in through connected ink.
        dist = np.full(crop.shape[:2], 1e9, dtype=np.float32)
        ph, pw = pano_arr.shape[0], pano_arr.shape[1]
        for nu, nv in BG_POINTS_NORM:
            cx_, cy_ = int(nu * pw), int(nv * ph)
            cy_ = min(max(cy_, 6), ph - 7)
            cx_ = min(max(cx_, 6), pw - 7)
            ref = np.median(
                pano_arr[cy_ - 6 : cy_ + 6, cx_ - 6 : cx_ + 6].reshape(-1, 3),
                axis=0,
            )
            d = np.sqrt(((crop - ref[None, None, :]) ** 2).sum(axis=2))
            dist = np.minimum(dist, d)
        obj &= dist > 60.0

    obj = ndimage.binary_closing(obj, iterations=3)
    obj = ndimage.binary_fill_holes(obj)
    # Opening drops thin ink tails (baseboard / wall trim lines).
    obj = ndimage.binary_opening(obj, iterations=open_iters)

    # Keep the component anchored at the plane center (the target itself).
    labels, n = ndimage.label(obj)
    if n > 1:
        cy, cx = th // 2, tw // 2
        center_label = labels[cy, cx]
        if center_label == 0:
            ys, xs = np.nonzero(obj)
            if len(ys):
                idx = np.argmin((ys - cy) ** 2 + (xs - cx) ** 2)
                center_label = labels[ys[idx], xs[idx]]
        if center_label:
            obj = labels == center_label
    obj = ndimage.binary_fill_holes(obj)

    rim = obj & ~ndimage.binary_erosion(obj, iterations=7)
    rim_f = ndimage.gaussian_filter(rim.astype(np.float32), 3.0)
    rim_f = np.clip(rim_f * 2.4, 0, 1)

    out = np.zeros((th, tw, 4), dtype=np.uint8)
    out[..., 0:3] = 255
    out[..., 3] = (rim_f * 255).astype(np.uint8)
    return Image.fromarray(out)


def rounded_rect_alpha(
    tw: int,
    th: int,
    rel_w: float,
    rel_h: float,
    radius_frac: float,
    feather: float = 2.0,
    center: tuple[float, float] | None = None,
) -> np.ndarray:
    """Anti-aliased rounded-rect mask (1 inside, 0 outside).

    `center` is (cx, cy) in texels; default is the texture midpoint.
    """
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    cx, cy = center if center is not None else (tw / 2, th / 2)
    hw, hh = rel_w * tw / 2, rel_h * th / 2
    r = radius_frac * min(hw, hh) * 2
    dx = np.abs(xx - cx) - (hw - r)
    dy = np.abs(yy - cy) - (hh - r)
    dist = np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) + np.minimum(
        np.maximum(dx, dy), 0
    ) - r
    return np.clip(0.5 - dist / feather, 0, 1)


def _keep_center_component(obj: np.ndarray, th: int, tw: int) -> np.ndarray:
    labels, n = ndimage.label(obj)
    if n > 1:
        cy, cx = th // 2, tw // 2
        center_label = labels[cy, cx]
        if center_label == 0:
            ys, xs = np.nonzero(obj)
            if len(ys):
                idx = np.argmin((ys - cy) ** 2 + (xs - cx) ** 2)
                center_label = labels[ys[idx], xs[idx]]
        if center_label:
            obj = labels == center_label
    return obj


def toy_sprite(
    pano_arr: np.ndarray, u: float, v: float, pw: float, ph: float, mode: str
) -> Image.Image:
    """Alpha-cut billboard of a painted toy (filled silhouette, soft edge)."""
    scale = 512 / max(pw, ph)
    tw = max(2, round(pw * scale))
    th = max(2, round(ph * scale))
    crop = project_pano_to_plane(pano_arr, u, v, pw, ph, MASK_PLANE_RADIUS, tw, th)
    lum = crop.astype(np.float32).max(axis=2)

    if mode == "patch":
        yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
        rx = np.abs(xx - tw / 2) / (tw / 2 * 0.92)
        ry = np.abs(yy - th / 2) / (th / 2 * 0.88)
        d = np.maximum(rx, ry)
        alpha = np.clip((1 - d) * 8, 0, 1)
    else:
        if mode == "dark":
            # Near-black AND neutral — keeps the gray headphones, drops the
            # warm brown shadow on the wood panel behind them.
            spread = crop.astype(np.float32).max(axis=2) - crop.astype(
                np.float32
            ).min(axis=2)
            obj = (lum < 90) & (spread < 35)
            obj = ndimage.binary_closing(obj, iterations=2)
        else:  # flood — only true black ink blocks the fill (soft shadows pass)
            ink = ndimage.binary_dilation(lum < 60, iterations=1)
            free = ~ink
            labels, _ = ndimage.label(free)
            border_labels = np.unique(
                np.concatenate(
                    [labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]]
                )
            )
            bg = np.isin(labels, border_labels[border_labels != 0])
            obj = ~bg
            obj = ndimage.binary_closing(obj, iterations=2)
        obj = ndimage.binary_fill_holes(obj)
        obj = ndimage.binary_opening(obj, iterations=3)
        obj = _keep_center_component(obj, th, tw)
        obj = ndimage.binary_fill_holes(obj)
        alpha = np.clip(ndimage.gaussian_filter(obj.astype(np.float32), 1.2), 0, 1)

    out = np.dstack([crop, (alpha * 255).astype(np.uint8)])
    return Image.fromarray(out)


def crt_overlays(pano_arr: np.ndarray) -> None:
    """Bezel frame (tube hole) + tube backings, in CrtScreen plane space.

    Frame is sampled from the file-space chassis crop so the silver bezel /
    stickers survive even when the gnomonic billboard is tube-dominant.
    """
    u, v, w, h = CRT_PLANE
    frame_w, frame_h = w * CRT_FRAME_W_FAC, h * CRT_FRAME_H_FAC
    screen_w, screen_h = w * CRT_SCREEN_W_FAC, h * CRT_SCREEN_H_FAC
    tw = 1024
    th = max(2, round(tw * frame_h / frame_w))

    # Chassis from the illustration source (keeps bezel readable).
    src = Image.open(SRC).convert("RGB")
    sw, sh = src.size
    nu0, nv0, nu1, nv1 = CRT_FILE_BOX_NORM
    box = (int(nu0 * sw), int(nv0 * sh), int(nu1 * sw), int(nv1 * sh))
    chassis = src.crop(box).resize((tw, th), Image.Resampling.LANCZOS)
    rgb = np.asarray(chassis).astype(np.float32)
    lum = rgb.mean(axis=2)

    # Dark empty tube punched as the video hole (feathered).
    dark = lum < 72
    yy, xx = np.mgrid[0:th, 0:tw].astype(np.float32)
    # Prefer the central glass pocket — ignore dark floor/wall in the crop.
    cx0, cy0 = tw * 0.52, th * 0.58
    rad = np.sqrt(((xx - cx0) / (tw * 0.36)) ** 2 + ((yy - cy0) / (th * 0.40)) ** 2)
    dark &= rad < 1.0
    dark = ndimage.binary_opening(dark, iterations=2)
    dark = ndimage.binary_closing(dark, iterations=5)
    dark = ndimage.binary_fill_holes(dark)
    labels, n = ndimage.label(dark)
    if n:
        sizes = [(labels == i).sum() for i in range(1, n + 1)]
        hole = labels == (int(np.argmax(sizes)) + 1)
    else:
        hole = np.zeros((th, tw), dtype=bool)
    hole_f = np.clip(ndimage.gaussian_filter(hole.astype(np.float32), 1.6), 0, 1)

    # Soft-round the authored screen rect as a fallback / union so CrtScreen
    # video always has a clean aperture even if flood detection shrinks.
    hole_cx = (0.5 + CRT_SCREEN_OX / frame_w) * tw
    hole_cy = (0.5 - CRT_SCREEN_OY / frame_h) * th
    authored = rounded_rect_alpha(
        tw,
        th,
        screen_w / frame_w,
        screen_h / frame_h,
        0.14,
        feather=3.0,
        center=(hole_cx, hole_cy),
    )
    hole_f = np.maximum(hole_f, authored)

    frame = np.dstack([rgb.astype(np.uint8), ((1 - hole_f) * 255).astype(np.uint8)])
    Image.fromarray(frame).save(HOTSPOT_DIR / "crt_frame.webp", "WEBP", quality=92)
    print(f"wrote crt_frame.webp {tw}x{th} hole@({hole_cx:.0f},{hole_cy:.0f})")

    # Backings render on planes of screen*1.04 / screen*1.02 — draw the tube
    # rounded-rect at ~1/1.04 relative size so it matches the painted glass.
    bw = 1024
    bh = max(2, round(bw * screen_h / screen_w))
    for name, base, edge_gain in (
        ("crt_backing_off", (18, 28, 36), 0.55),
        ("crt_backing_playing", (5, 5, 6), 0.9),
    ):
        glass = rounded_rect_alpha(bw, bh, 1 / 1.04, 1 / 1.04, 0.14, feather=3.0)
        yy, xx = np.mgrid[0:bh, 0:bw].astype(np.float32)
        r2 = ((xx - bw / 2) / (bw / 2)) ** 2 + ((yy - bh / 2) / (bh / 2)) ** 2
        shade = 1 - edge_gain * np.clip(r2, 0, 1)
        img = np.zeros((bh, bw, 4), dtype=np.uint8)
        for c in range(3):
            img[..., c] = np.clip(base[c] * shade, 0, 255).astype(np.uint8)
        img[..., 3] = (glass * 255).astype(np.uint8)
        Image.fromarray(img).save(HOTSPOT_DIR / f"{name}.webp", "WEBP", quality=90)
        print(f"wrote {name}.webp {bw}x{bh}")


def main() -> None:
    pano = bake_pano()
    pano.save(OUT_ON, "WEBP", quality=90, method=6)
    print(f"wrote {OUT_ON.name} {pano.size}")

    pano.save(OUT_PNG, optimize=True)
    print(f"wrote {OUT_PNG.name}")

    off = lights_off(pano)
    off.save(OUT_OFF, "WEBP", quality=88, method=6)
    print(f"wrote {OUT_OFF.name}")

    pano.resize((512, 256), Image.Resampling.LANCZOS).save(
        OUT_LQIP, "WEBP", quality=70
    )
    print(f"wrote {OUT_LQIP.name}")

    pano_arr = np.asarray(pano.convert("RGB"))
    for sid in PLANES:
        mask = edge_mask(pano_arr, sid)
        out = HOTSPOT_DIR / f"{sid}_edge.webp"
        mask.save(out, "WEBP", quality=90)
        cover = np.asarray(mask)[..., 3]
        print(f"wrote {out.name} {mask.size} rim={100 * (cover > 30).mean():.1f}%")

    crt_overlays(pano_arr)

    for sid, (u, v, pw, ph, mode) in TOY_SPRITES.items():
        sprite = toy_sprite(pano_arr, u, v, pw, ph, mode)
        out = HOTSPOT_DIR / f"toy_{sid}.webp"
        sprite.save(out, "WEBP", quality=90)
        cover = np.asarray(sprite)[..., 3]
        print(f"wrote {out.name} {sprite.size} fill={100 * (cover > 30).mean():.1f}%")


if __name__ == "__main__":
    main()
