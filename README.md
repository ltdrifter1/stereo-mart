# Club Copy

Hangout space — a **digital virtual store** in 360°.

The Next.js sphere on `/` loads `public/textures/store_pano_v20.webp`.

## Routes

| Path | What |
|---|---|
| `/` | Hangout (enter → look around → hotspots) |
| `/#music` `#videos` `#artists` `#shop` `#contact` | Deep-link a section after enter |
| `/shop` | Brand bridge into the room (`/#shop`) |

## Content

Releases, CRT channels, artists, and shop rows live in **`app/data/catalog.ts`**.

Brand URLs / contact: **`lib/brand.ts`**.

## Develop

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- Shop bridge: http://localhost:3000/shop
