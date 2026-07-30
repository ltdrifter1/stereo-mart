#!/usr/bin/env python3
"""Rebuild hotspot *_edge.webp rims from art/props silhouettes.

Thin wrapper around the production bake's edge path — prefer:

  python3 scripts/build-v12-pano.py

which also grades the equirect and refreshes CRT / toy sprites.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    spec = importlib.util.spec_from_file_location(
        "bake", ROOT / "scripts" / "build-v12-pano.py"
    )
    bake = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(bake)

    # Dummy pano array — prop path does not sample it.
    dummy = np.zeros((64, 64, 3), dtype=np.uint8)
    bake.HOTSPOT_DIR.mkdir(parents=True, exist_ok=True)
    print("Building hotspot edge masks from prop silhouettes…")
    for sid in bake.PLANES:
        mask = bake.edge_mask(dummy, sid)
        out = bake.HOTSPOT_DIR / f"{sid}_edge.webp"
        mask.save(out, "WEBP", quality=92, method=6)
        cover = np.asarray(mask)[..., 3]
        print(f"  {out.name} {mask.size} rim={100 * (cover > 30).mean():.1f}%")
    print("Done →", bake.HOTSPOT_DIR)


if __name__ == "__main__":
    main()
