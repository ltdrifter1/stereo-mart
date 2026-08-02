# STEREO-MART v20 — illustrated 360° shop (KRPano rebuild)

Clean-slate workspace for the full overhaul. **Nothing under `/app`, `/lib`,
`/public` (the v17–v19 Three.js build) is reused here** — that tree is legacy
and will be deleted once v20 ships.

The goal: stepping into a hand-painted cartoon world — a quirky independent
record label shop in a cloudy Pacific-Northwest-meets-Seoul-backstreet
neighborhood. Heavy nods to balmingtiger.com, Hey Arnold! backgrounds, and
late-90s Nickelodeon environmental art. See `ART_DIRECTION.md`.

## Layout

```
v20/
  ART_DIRECTION.md      style bible: vision, palette, line rules
  NAVIGATION.md         in-world hotspot map + discovery (easter-egg) list
  brand/                redrawn Stereo-Mart logo (SVG, from the supplied mark)
  art/
    plates/             master illustration plates (interior wrap, street)
    props/              transparent overlay props / hotspot art
    refs/               generated style + logo references
  krpano/
    index.html          embed page (expects licensed krpano.js beside it)
    preview.html        DEV ONLY — pannellum viewer for coordinate tuning
    tour.xml            entry point (scene, includes)
    include/            view.xml, actions.xml, hotspots-nav.xml,
                        hotspots-life.xml, panels.xml, audio.xml
    js/discoveries.js   hidden-find tracking (localStorage bridge)
    audio/              synthesized placeholder ambience loops (ogg)
    panos/              multires tile output (generated, not committed)
  scripts/
    make-equirect.py    plate → seam-safe 2:1 masters (8192 / mobile / LQIP)
    cut-props.py        props sheet → transparent overlays + glow sprites
    make-patches.py     plate crops for in-place animation + light sprites
    gen-ambience.py     numpy/ffmpeg placeholder ambience synth
    shoot-preview.mjs   headless screenshots of preview.html (playwright)
```

## Pipeline

1. Paint / regenerate plates into `art/plates/` (2:1-ish, seam-aware).
2. Bake + derive assets:

```bash
python3 v20/scripts/make-equirect.py    # seam-safe 8192 master + mobile + LQIP
python3 v20/scripts/cut-props.py        # props sheet → transparent overlays + glows
python3 v20/scripts/make-patches.py     # in-place animation patches + light sprites
python3 v20/scripts/gen-ambience.py     # placeholder ambience loops (needs ffmpeg)
```

3. The tour loads the baked master directly as a `<sphere>` image, so it
   runs without tiling. For launch, run the licensed krpano tools
   (`krpanotools makepano`) on the master and swap the multires cube tiles
   into `tour.xml` (commented block) for faster first paint.
4. Open `krpano/index.html` via any static server (needs `krpano.js` from
   the licensed tools next to it).

### Dev preview without a krpano license

```bash
cd v20 && python3 -m http.server 8123
# open http://localhost:8123/krpano/preview.html
```

`preview.html` renders the master with open-source pannellum, mirrors all
hotspot coordinates as labeled markers, and click-copies `ath/atv` for the
XML. `scripts/shoot-preview.mjs` (playwright + system Chrome) screenshots
the four walls headlessly for review. The current master is upscaled from
the 1536px concept plate — sharp enough to tune hotspots and feel; the
final 8192 bake needs a repainted hi-res plate.

## Ground rules

- All navigation lives **inside the illustration** (crate, cassette rack,
  poster wall, desk, mail slot, door, listening station). No floating menus.
- Hotspots are layered PNG/SVG overlays; camera moves / hovers / transitions
  are krpano actions, not DOM overlays.
- Animations are slow, subtle, environmental (Ghibli loop energy).
- Audio is quiet ambience only, opt-in, never autoplay music.
- Target: desktop + mobile, 60 FPS, fast first paint (LQIP preview + tiles).
