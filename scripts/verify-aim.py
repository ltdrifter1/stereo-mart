#!/usr/bin/env python3
"""
Verify hotspot aim framing + edge-mask alignment against the live pano.

For every section in app/data/sections.ts this renders the exact desktop
lookto view (same yaw/pitch/MFOV math as lib/pano.ts + lib/navigation)
straight from the equirect texture, then overlays the section's
public/hotspots/<id>_edge.webp rim the way Hotspot.tsx places it
(billboard plane at SPHERE_RADIUS − 0.5, additive gold + bloom).

Use it after dropping in a new pano or new edge maps:

    npm run verify:aim

Outputs .shots/aim/<id>.png and .shots/aim/contact-sheet.png, and prints
how much of each mask's energy lands inside the framed view.

Deps: python3 + numpy + pillow (pip install numpy pillow), npx/tsx.
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / ".shots" / "aim"

# Desktop reference viewport (matches scripts/test-nav-camera.ts).
ASPECT = 1440 / 900
RENDER_W, RENDER_H = 1152, 720
MFOV_RATIO = 4 / 3

# Hotspot.tsx GLOW tuning (rest pose: wave = 0).
EDGE_TINT = np.array([255, 233, 168], dtype=np.float32)  # #ffe9a8
BLOOM_TINT = np.array([255, 210, 122], dtype=np.float32)  # #ffd27a
EDGE_OPACITY = 0.82
BLOOM_OPACITY = 0.28
BLOOM_SCALE = 1.14
PLANE_RADIUS_INSET = 0.5


def mfov_to_vfov(mfov_deg: float, aspect: float) -> float:
    m = math.radians(mfov_deg) / 2
    if aspect >= MFOV_RATIO:
        return math.degrees(2 * math.atan(math.tan(m) / aspect))
    return mfov_deg


def u_to_yaw(u: float) -> float:
    return (u - 0.5) * math.pi * 2 - math.pi / 2


def v_to_pitch(v: float) -> float:
    return (0.5 - v) * math.pi


def rot_yxz(yaw: float, pitch: float) -> np.ndarray:
    """three.js YXZ euler: world = Ry(yaw) @ Rx(pitch) @ local."""
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    return ry @ rx


def uv_to_spherical(u: float, v: float, radius: float) -> np.ndarray:
    yaw, pitch = u_to_yaw(u), v_to_pitch(v)
    cp, sp = math.cos(pitch), math.sin(pitch)
    sy, cy = math.sin(yaw), math.cos(yaw)
    return np.array([-sy * cp * radius, sp * radius, -cy * cp * radius])


def pixel_dirs(mfov_deg: float) -> np.ndarray:
    """World-space ray directions for every render pixel (H, W, 3)."""
    vfov = math.radians(mfov_to_vfov(mfov_deg, ASPECT))
    tan_v = math.tan(vfov / 2)
    tan_h = tan_v * ASPECT
    xs = np.linspace(-1, 1, RENDER_W) * tan_h
    ys = np.linspace(1, -1, RENDER_H) * tan_v
    gx, gy = np.meshgrid(xs, ys)
    d = np.stack([gx, gy, -np.ones_like(gx)], axis=-1)
    return d / np.linalg.norm(d, axis=-1, keepdims=True)


def sample_equirect(pano: np.ndarray, dirs: np.ndarray) -> np.ndarray:
    """Sample the pano file exactly as the BackSide sphere shows it
    (SphereGeometry UV + texture.repeat.x = −1 → file_u = 1 − geom_u)."""
    h, w = pano.shape[:2]
    x, y, z = dirs[..., 0], dirs[..., 1], dirs[..., 2]
    theta = np.arccos(np.clip(y, -1, 1))
    st = np.maximum(np.sin(theta), 1e-9)
    phi = np.arctan2(z / st, -x / st)
    phi = np.mod(phi, 2 * math.pi)
    file_u = np.mod(1 - phi / (2 * math.pi), 1)
    file_v = theta / math.pi
    px = np.clip((file_u * w).astype(np.int32), 0, w - 1)
    py = np.clip((file_v * h).astype(np.int32), 0, h - 1)
    return pano[py, px].astype(np.float32)


def overlay_plane(
    frame: np.ndarray,
    dirs: np.ndarray,
    mask_a: np.ndarray,
    center: np.ndarray,
    pw: float,
    ph: float,
    tint: np.ndarray,
    opacity: float,
) -> None:
    """Additively composite the edge plane (billboard lookAt(origin)).

    three.js lookAt points the plane's +z AT the origin — textures are
    authored in file space and read un-mirrored from the camera.
    """
    z_ax = -center / np.linalg.norm(center)
    up = np.array([0.0, 1.0, 0.0])
    x_ax = np.cross(up, z_ax)
    x_ax /= np.linalg.norm(x_ax)
    y_ax = np.cross(z_ax, x_ax)

    denom = dirs @ z_ax
    safe = np.abs(denom) > 1e-6
    t = np.where(safe, (center @ z_ax) / np.where(safe, denom, 1), -1)
    hit = dirs * t[..., None] - center
    lx = hit @ x_ax
    ly = hit @ y_ax
    mu = lx / pw + 0.5
    mv = 0.5 - ly / ph
    mh, mw = mask_a.shape
    inside = (t > 0) & (mu >= 0) & (mu < 1) & (mv >= 0) & (mv < 1)
    px = np.clip((mu * mw).astype(np.int32), 0, mw - 1)
    py = np.clip((mv * mh).astype(np.int32), 0, mh - 1)
    a = np.where(inside, mask_a[py, px], 0.0)
    a = np.clip(a * 1.15, 0, 1) * opacity  # prepGlowMap alpha boost
    frame += a[..., None] * tint[None, None, :]


def mask_coverage(
    cam: np.ndarray,
    mfov_deg: float,
    mask_a: np.ndarray,
    center: np.ndarray,
    pw: float,
    ph: float,
) -> float:
    """Alpha-weighted fraction of mask texels inside the view frustum."""
    vfov = math.radians(mfov_to_vfov(mfov_deg, ASPECT))
    tan_v = math.tan(vfov / 2)
    tan_h = tan_v * ASPECT

    z_ax = -center / np.linalg.norm(center)
    up = np.array([0.0, 1.0, 0.0])
    x_ax = np.cross(up, z_ax)
    x_ax /= np.linalg.norm(x_ax)
    y_ax = np.cross(z_ax, x_ax)

    mh, mw = mask_a.shape
    mu = (np.arange(mw) + 0.5) / mw
    mv = (np.arange(mh) + 0.5) / mh
    gu, gv = np.meshgrid(mu, mv)
    lx = (gu - 0.5) * pw
    ly = (0.5 - gv) * ph
    pos = center[None, None, :] + lx[..., None] * x_ax + ly[..., None] * y_ax
    d_cam = pos @ cam  # cam is orthonormal: world→camera via R.T ≡ pos @ R
    behind = d_cam[..., 2] >= -1e-6
    sx = np.abs(d_cam[..., 0] / np.where(behind, 1, -d_cam[..., 2]))
    sy = np.abs(d_cam[..., 1] / np.where(behind, 1, -d_cam[..., 2]))
    visible = ~behind & (sx <= tan_h) & (sy <= tan_v)

    total = float(mask_a.sum())
    if total <= 0:
        return 0.0
    return float((mask_a * visible).sum()) / total


def main() -> None:
    dump = subprocess.run(
        ["npx", "tsx", "scripts/dump-sections.ts"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if dump.returncode != 0:
        sys.exit(f"dump-sections failed:\n{dump.stderr}")
    data = json.loads(dump.stdout)

    pano_path = ROOT / "public" / data["texture"].lstrip("/")
    pano = np.asarray(Image.open(pano_path).convert("RGB"))
    plane_r = data["sphereRadius"] - PLANE_RADIUS_INSET
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    tiles: list[Image.Image] = []
    for s in data["sections"]:
        dirs = pixel_dirs(s["lookFov"])
        cam = rot_yxz(u_to_yaw(s["lookU"]), v_to_pitch(s["lookV"]))
        dirs = dirs @ cam.T
        frame = sample_equirect(pano, dirs)

        # Sanity: center pixel must sample file_u ≈ 1 − lookU (yaw phase).
        fwd = cam @ np.array([0.0, 0.0, -1.0])
        theta = math.acos(max(-1, min(1, fwd[1])))
        st = max(math.sin(theta), 1e-9)
        phi = math.atan2(fwd[2] / st, -fwd[0] / st) % (2 * math.pi)
        got = (1 - phi / (2 * math.pi)) % 1
        want = (1 - s["lookU"]) % 1
        drift = min(abs(got - want), 1 - abs(got - want))
        assert drift < 0.005, f"{s['id']}: yaw phase drift {drift:.4f}"

        coverage = 0.0
        suffix = "edge" if s["goldEdge"] else "glow"
        mask_path = ROOT / "public" / "hotspots" / f"{s['id']}_{suffix}.webp"
        if mask_path.exists():
            mask = np.asarray(Image.open(mask_path).convert("RGBA"))
            mask_a = mask[..., 3].astype(np.float32) / 255.0
            center = uv_to_spherical(s["u"], s["v"], plane_r)
            overlay_plane(
                frame, dirs, mask_a, center,
                s["w"] * BLOOM_SCALE, s["h"] * BLOOM_SCALE,
                BLOOM_TINT, BLOOM_OPACITY,
            )
            overlay_plane(
                frame, dirs, mask_a, center,
                s["w"], s["h"], EDGE_TINT, EDGE_OPACITY,
            )
            coverage = mask_coverage(
                cam, s["lookFov"], mask_a, center, s["w"], s["h"],
            )
        else:
            print(f"  ! missing mask {mask_path.name}")

        img = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8))
        draw = ImageDraw.Draw(img)
        cx, cy = RENDER_W // 2, RENDER_H // 2
        draw.line([(cx - 12, cy), (cx + 12, cy)], fill=(90, 255, 120), width=2)
        draw.line([(cx, cy - 12), (cx, cy + 12)], fill=(90, 255, 120), width=2)
        label = f"{s['id']}  fov={s['lookFov']}  edge in frame: {coverage * 100:.0f}%"
        draw.rectangle([0, 0, RENDER_W, 26], fill=(0, 0, 0))
        draw.text((8, 7), label, fill=(255, 233, 168))

        out = OUT_DIR / f"{s['id']}.png"
        img.save(out)
        tiles.append(img)
        print(f"wrote {out.relative_to(ROOT)}  edge visible {coverage * 100:.1f}%")

    sheet = Image.new("RGB", (RENDER_W, (RENDER_H + 4) * len(tiles)), (16, 16, 16))
    for i, tile in enumerate(tiles):
        sheet.paste(tile, (0, i * (RENDER_H + 4)))
    sheet_out = OUT_DIR / "contact-sheet.png"
    sheet.save(sheet_out)
    print(f"wrote {sheet_out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
