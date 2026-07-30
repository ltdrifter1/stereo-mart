# Illustrator brief — Stereo-Mart hotspot edge glows

**One-liner:** Paint 5 transparent edge-glow masks that hug the exact painted silhouettes in our 360° store room — warm cream rim light like [balmingtiger.com](https://balmingtiger.com) hover auras, original art only.

---

## Who to hire

A **2D texture / matte painter** (or the artist who painted the room).  
Photoshop / Procreate. Ideal if they’ve done game UI glow masks, VFX mattes, or interactive web hotspot edges.

Not a Three.js / creative-code hire — outlines must come from the painted pixels, not from boxes.

**Where:** room painter first → Upwork / Contra / Twine (“texture artist”, “matte painter”, “UI glow mask”, “game VFX mask”) → Awwwards / creative Discords if you want BT-room familiarity.

**Job title:**  
`Illustrator needed: silhouette edge-glow masks for 360° WebGL hotspots (Stereo-Mart Records)`

**Budget:** ~$150–400 if the room artist does it; more if crops must be reverse-engineered from scratch.

---

## Deliverables

| File | Object in `store_pano` |
|---|---|
| `listening-booth_edge.webp` | Headphones + turntable / listen station |
| `crt-tv_edge.webp` | CRT set (full chassis, not only the glass) |
| `record-bins_edge.webp` | Record bin island |
| `cash-register_edge.webp` | Cash register body |
| `phone-booth_edge.webp` | Rotary phone |

Replace the loose masks already in `public/hotspots/`.

---

## Specs (copy into the job post)

1. **Size:** 512×512 or 1024×1024, **RGBA WebP**
2. **Paint:** soft white/cream rim on **transparent** background
3. **Shape:** follow the **exact outer silhouette** of the object in the equirect pano — tight to the brush edge
4. **Falloff:** soft outer glow only (warm edge light). No filled slab, no rectangle, no text, no labels
5. **Align:** we’ll supply UV crop + screenshots; mask must register with the pano object
6. **Feel:** balmingtiger.com hover aura (bright warm rim, soft bloom) — **do not copy BT assets**
7. **Brightness:** rim should read clearly on a dark shop interior (cream ~`#ffe9a8` / amber bloom ~`#ffd27a` once tinted in code)

---

## What we send the artist

- Equirect plate: `public/textures/store_pano_v15.webp` (or master PNG in `art/`)
- Current (too-loose) edges in `public/hotspots/*_edge.webp` as “what not to ship”
- Per-object UV crop + lookto screenshot for each of the 5 hotspots
- Link: https://balmingtiger.com — hover objects in the room for the glow *feel* only

---

## Done when

Drop the 5 WebPs into `public/hotspots/` with the same filenames.  
Code path is ready (`goldEdge` + rim/bloom in `lib/glow.ts`). We only retune breath/opacity and verify aim framing — we cannot author correct outlines in code.
