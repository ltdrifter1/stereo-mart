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
    index.html          embed page
    tour.xml            entry point (scene, includes)
    include/            view.xml, actions.xml, hotspots-nav.xml,
                        hotspots-life.xml, audio.xml
    panos/              multires tile output (generated, not committed)
  scripts/
    make-equirect.py    plate → 2:1 equirect master (8192×4096)
```

## Pipeline

1. Paint / regenerate plates into `art/plates/` (2:1-ish, seam-aware).
2. `python3 v20/scripts/make-equirect.py` → `art/plates/pano-equirect-master.png`.
   Current master is baked at 4096×2048 from the 1536px concept plate — good
   enough to block out hotspots and camera; the 8192 final bake needs a
   repainted hi-res plate.
3. Run the krpano tools (`krpanotools makepano`) on the master to fill
   `krpano/panos/` (multires cube tiles — krpano license lives outside repo).
4. Open `krpano/index.html` via any static server.

## Ground rules

- All navigation lives **inside the illustration** (crate, cassette rack,
  poster wall, desk, mail slot, door, listening station). No floating menus.
- Hotspots are layered PNG/SVG overlays; camera moves / hovers / transitions
  are krpano actions, not DOM overlays.
- Animations are slow, subtle, environmental (Ghibli loop energy).
- Audio is quiet ambience only, opt-in, never autoplay music.
- Target: desktop + mobile, 60 FPS, fast first paint (LQIP preview + tiles).
