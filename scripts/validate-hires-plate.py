#!/usr/bin/env python3
"""Validate the native 8192 plate, derivatives, and silhouette ID map.

    npm run test:hires
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public" / "textures"
HS = ROOT / "public" / "hotspots"
META = ROOT / "v20" / "art" / "plates" / "hires-bake-meta.json"
MASTER_JPG = ROOT / "v20" / "art" / "plates" / "pano-equirect-master.jpg"
INTERIOR = ROOT / "v20" / "art" / "plates" / "pano-interior-plate.png"

EXPECTED = {
    PUB / "store_pano_v20_8k.webp": (8192, 4096),
    PUB / "store_pano_v20.webp": (4096, 2048),
    PUB / "store_pano_v20_2k.webp": (2048, 1024),
    PUB / "store_pano_off_v20.webp": (4096, 2048),
    PUB / "store_pano_lqip_v20.webp": (512, 256),
    HS / "silhouette-id-map.webp": (2048, 1024),
}

PRIMARY = [
    "listening-booth",
    "crt-tv",
    "record-bins",
    "cash-register",
    "cassette-rack",
    "front-door",
    "desk",
    "phone-booth",
    "lamp",
]


def fail(msg: str) -> None:
    print(f"FAIL  {msg}")
    raise SystemExit(1)


def ok(msg: str) -> None:
    print(f"ok    {msg}")


def laplacian_energy(rgb: np.ndarray) -> float:
    g = rgb.astype(np.float32)
    lum = g[..., 0] * 0.299 + g[..., 1] * 0.587 + g[..., 2] * 0.114
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    # crop a mid-band strip so zenith/nadir poles don't dominate
    h, w = lum.shape
    strip = lum[h // 3 : (2 * h) // 3]
    pad = np.pad(strip, 1, mode="wrap")
    acc = (
        k[0, 1] * pad[0:-2, 1:-1]
        + k[1, 0] * pad[1:-1, 0:-2]
        + k[1, 1] * pad[1:-1, 1:-1]
        + k[1, 2] * pad[1:-1, 2:]
        + k[2, 1] * pad[2:, 1:-1]
    )
    return float(np.mean(acc * acc))


def main() -> None:
    for path, size in EXPECTED.items():
        if not path.exists():
            fail(f"missing {path.relative_to(ROOT)}")
        im = Image.open(path)
        if im.size != size:
            fail(f"{path.name} is {im.size}, expected {size}")
        kb = path.stat().st_size / 1024
        ok(f"{path.relative_to(ROOT)}  {im.size[0]}×{im.size[1]}  {kb:.1f}KB")

    eight = Image.open(PUB / "store_pano_v20_8k.webp").convert("RGB")
    arr = np.asarray(eight)
    if arr.shape[0] * 2 != arr.shape[1]:
        fail("8k is not 2:1 equirect")
    seam = np.abs(arr[:, 0].astype(np.int16) - arr[:, -1].astype(np.int16))
    seam_mean = float(seam.mean())
    mid = arr.shape[1] // 2
    interior = np.abs(arr[:, mid].astype(np.int16) - arr[:, mid + 8].astype(np.int16))
    interior_mean = float(interior.mean())
    # Lossy webp will not keep column 0 == column −1 exactly; the wrap must
    # still be quieter than an 8px interior step in the painting.
    if seam_mean > 8.0 or seam_mean > interior_mean * 0.55:
        fail(
            f"0/360 seam mean Δ={seam_mean:.2f} vs interior {interior_mean:.2f} "
            "(wrap should be quieter than the painting)"
        )
    ok(f"seam wrap Δ={seam_mean:.2f} < interior-8px Δ={interior_mean:.2f}")

    if MASTER_JPG.exists():
        m = Image.open(MASTER_JPG)
        if m.size != (8192, 4096):
            fail(f"master jpg {m.size}, expected 8192×4096")
        ok(f"master jpg {m.size}  {MASTER_JPG.stat().st_size/1024:.1f}KB")

    # Native detail: 8k must carry more high-frequency energy than Lanczos of 1536.
    if INTERIOR.exists():
        src = Image.open(INTERIOR).convert("RGB")
        lanczos = np.asarray(src.resize((8192, 4096), Image.Resampling.LANCZOS))
        e8 = laplacian_energy(arr)
        eL = laplacian_energy(lanczos)
        if e8 <= eL * 1.05:
            fail(f"8k HF energy {e8:.3f} is not above Lanczos {eL:.3f} — looks like an upscale")
        ok(f"native HF energy {e8:.1f} > Lanczos-of-1536 {eL:.1f} ({e8/eL:.2f}×)")

    id_im = Image.open(HS / "silhouette-id-map.webp").convert("RGBA")
    ids = np.asarray(id_im)[..., 0]
    unique = sorted(int(v) for v in np.unique(ids) if int(v) > 0)
    if unique != list(range(1, 10)):
        fail(f"ID map unique ids {unique}, expected 1–9")
    ok(f"ID map packed ids {unique}")

    meta = json.loads(META.read_text())
    names = [o["id"] for o in meta["objects"]]
    if names != PRIMARY:
        fail(f"meta objects {names} != {PRIMARY}")
    for o in meta["objects"]:
        if o["coverage"] < 0.05:
            fail(f"{o['id']} mask coverage {o['coverage']} is empty")
        if o["coverage"] > 0.92:
            fail(f"{o['id']} mask coverage {o['coverage']} looks like a filled rectangle")
    ok("all primary object masks have non-rectangular coverage")

    for name in PRIMARY:
        sil = HS / f"{name}_silhouette.webp"
        if not sil.exists():
            fail(f"missing {sil.name}")
        im = Image.open(sil)
        if im.mode != "RGBA":
            fail(f"{sil.name} must be RGBA (object alpha)")
    ok("per-object silhouette crops are RGBA")

    print("\nAll hi-res plate checks passed.")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL  {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
