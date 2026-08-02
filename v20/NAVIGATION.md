# STEREO-MART v20 — In-world navigation & discoveries

No floating menus. Every destination is an object in the illustration.

## Primary hotspots (nav)

Measured off rendered views (`krpano/preview.html` + `scripts/shoot-preview.mjs`).
The camera default (ath 0) faces the storefront window.

| Object in room                    | Destination  | ath  | atv | zoomfov |
|-----------------------------------|--------------|------|-----|---------|
| Record crates (NEW ARRIVALS bins) | Releases     | 172  | 5   | 55 |
| Cassette rack (tape shelf)        | Catalog      | 138  | -12 | 50 |
| Poster wall (above the bins)      | Artists      | -175 | -25 | 60 |
| Desk (demo tapes, lamp, mug)      | About        | 95   | 15  | 60 |
| Mail slot (door lower panel)      | Contact      | 43   | 13  | 45 |
| Glass door (OPEN sign)            | Enter Store  | 44   | -3  | 60 |
| Listening station (LISTEN HERE)   | Music player | -88  | -6  | 50 |

Source of truth is `krpano/include/hotspots-nav.xml` (never hardcode
coordinates in actions); the marker mirror in `preview.html` must be kept in
sync by hand.

Nav hotspots are invisible glow silhouettes over the painted objects — no
double-drawn props. Hover: soft warm aura fades in + hand-drawn paper
tooltip. Click: `lookto` glide → slight zoom → content panel slides in →
soft ambient swell. Nothing abrupt. The mail slot is the one visible
overlay prop (the painted door has none).

## Ambient life (wired now)

cat breathes (plate patch, pixel-aligned) · coffee steams above the #1
CUSTOMER mug · desk lamp flickers once in a while (additive light pool).

Planned for the repaint pass (need separated plate layers, not overlays):
fan rotation · platter spin · speaker cone vibration · clouds · wire sway ·
pigeon shuffle · poster corner lift · cassette rewind.

## Hidden discoveries (wired now, tracked in `krpano/js/discoveries.js`)

| id       | what                                    | where |
|----------|-----------------------------------------|-------|
| cat      | pet the sleeping cat                    | ath -163, atv 24 |
| ghost    | tiny ghost blips into the storage room  | ath 109, atv -5 |
| rabbit   | rabbit sticker on the speaker cone      | ath -114, atv 20 |
| turtle   | turtle sticker by the record stacks     | ath -146, atv 19 |
| mushroom | tiny mushroom in the window plant pot   | ath -53, atv 15 |

Finds persist per browser (localStorage) with a running tally toast.
Still on the wishlist: bird lands on the sill · vinyl sleeve slips · smiley
faces scratched into the desk · hidden label logos in poster art · CRT blips
to a secret channel. A returning visitor should find something new every
visit.

## Audio bed (opt-in, very quiet)

Synth placeholders live in `krpano/audio/` (see `scripts/gen-ambience.py`;
swap for field recordings at launch): street murmur · birds · distant train
· vinyl crackle · low HVAC hum · occasional muffled music from the back
room. The bed arms on the first click in the room; music itself never
autoplays — only via the listening station.
