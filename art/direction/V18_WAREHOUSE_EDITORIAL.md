# Stereo-Mart v18 — warehouse editorial (Balming Tiger UX, own identity)

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
