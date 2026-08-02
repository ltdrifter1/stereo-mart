#!/usr/bin/env python3
"""Synthesize license-clean placeholder ambience loops for the shop.

Everything is generated from noise + sine primitives with numpy, written as
wav, then encoded to ogg via ffmpeg into v20/krpano/audio/. These are
placeholders shaped to the right feel (quiet, muffled, environmental) —
swap in field recordings for launch.

  street.ogg   distant traffic murmur (looped brown noise, slow swells)
  birds.ogg    sparse songbird chirps
  hvac.ogg     low fridge/vent hum
  crackle.ogg  vinyl surface noise
  train.ogg    one-shot distant train pass
  muffled.ogg  one-shot muffled music through a wall
  click.ogg    soft UI tick
  chime.ogg    two-note discovery chime

Usage:  python3 v20/scripts/gen-ambience.py
"""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import numpy as np

SR = 32000
OUT = Path(__file__).resolve().parents[1] / "krpano" / "audio"
rng = np.random.default_rng(2026)


def brown(n: int) -> np.ndarray:
    x = np.cumsum(rng.standard_normal(n))
    x -= np.linspace(x[0], x[-1], n)  # loopable: start == end
    return x / (np.abs(x).max() + 1e-9)


def lowpass(x: np.ndarray, alpha: float) -> np.ndarray:
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def loopify(x: np.ndarray, fade: float = 1.0) -> np.ndarray:
    """Cross-fade the tail into the head so the loop is seamless."""
    n = int(fade * SR)
    ramp = np.linspace(0, 1, n)
    x[:n] = x[:n] * ramp + x[-n:] * (1 - ramp)
    return x[:-n]


def save(name: str, x: np.ndarray, gain: float = 0.9) -> None:
    x = np.clip(x / (np.abs(x).max() + 1e-9) * gain, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    with tempfile.NamedTemporaryFile(suffix=".raw") as tmp:
        tmp.write(pcm.tobytes())
        tmp.flush()
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR),
             "-ac", "1", "-i", tmp.name, "-c:a", "libvorbis", "-q:a", "2",
             str(OUT / f"{name}.ogg")],
            check=True,
        )
    secs = len(x) / SR
    print(f"{name}.ogg  {secs:.1f}s")


def street() -> None:
    n = SR * 24
    base = lowpass(brown(n), 0.02)
    swell = 0.6 + 0.4 * np.sin(np.linspace(0, 4 * np.pi, n) + 1.3)
    save("street", loopify(base * swell), 0.8)


def birds() -> None:
    n = SR * 22
    x = np.zeros(n)
    for _ in range(9):
        t0 = rng.integers(0, n - SR)
        dur = int(SR * rng.uniform(0.08, 0.22))
        t = np.arange(dur) / SR
        f = rng.uniform(2400, 4200) + rng.uniform(-900, 900) * t / t[-1]
        chirp = np.sin(2 * np.pi * f * t) * np.hanning(dur)
        x[t0:t0 + dur] += chirp * rng.uniform(0.25, 0.5)
    save("birds", loopify(x, 0.5), 0.7)


def hvac() -> None:
    n = SR * 12
    t = np.arange(n) / SR
    hum = 0.5 * np.sin(2 * np.pi * 58 * t) + 0.25 * np.sin(2 * np.pi * 116 * t + 0.7)
    airy = lowpass(rng.standard_normal(n), 0.05) * 0.35
    save("hvac", loopify(hum + airy), 0.7)


def crackle() -> None:
    n = SR * 14
    x = lowpass(rng.standard_normal(n), 0.4) * 0.02
    for _ in range(220):
        i = rng.integers(0, n - 40)
        pop = rng.standard_normal(rng.integers(6, 30))
        x[i:i + len(pop)] += pop * rng.uniform(0.1, 0.6)
    save("crackle", loopify(lowpass(x, 0.55)), 0.75)


def train() -> None:
    n = SR * 13
    env = np.hanning(2 * n)[:n]  # swell in, out by the horn tail
    rumble = lowpass(brown(n), 0.01) * env
    t = np.arange(n) / SR
    horn = (np.sin(2 * np.pi * 311 * t) + np.sin(2 * np.pi * 370 * t)) * 0.12
    horn *= np.exp(-((t - 5.5) ** 2)) * env
    save("train", rumble + horn, 0.75)


def muffled() -> None:
    n = SR * 16
    t = np.arange(n) / SR
    x = np.zeros(n)
    chords = [(110, 165, 220), (98, 147, 196), (87, 131, 175), (110, 165, 220)]
    beat = 0.5 * (1 + np.sin(2 * np.pi * 1.8 * t - np.pi / 2)) ** 2
    for i, chord in enumerate(chords):
        seg = slice(i * n // 4, (i + 1) * n // 4)
        ts = t[seg]
        for f in chord:
            x[seg] += np.sin(2 * np.pi * f * ts) / len(chord)
    x = lowpass(x * (0.4 + 0.6 * beat), 0.03)
    env = np.hanning(2 * n)[:n]
    save("muffled", x * env, 0.7)


def click() -> None:
    n = int(SR * 0.09)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 640 * t) * np.exp(-t * 70)
    save("click", lowpass(x, 0.5), 0.6)


def chime() -> None:
    n = int(SR * 0.9)
    t = np.arange(n) / SR
    a = np.sin(2 * np.pi * 784 * t) * np.exp(-t * 6)
    b = np.sin(2 * np.pi * 1175 * t) * np.exp(-np.clip(t - 0.18, 0, None) * 6)
    b[t < 0.18] = 0
    save("chime", a * 0.6 + b * 0.5, 0.65)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for fn in (street, birds, hvac, crackle, train, muffled, click, chime):
        fn()
