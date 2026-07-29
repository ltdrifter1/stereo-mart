/**
 * Lightweight unit checks for nearest-item + hysteresis math.
 * Run: npx tsx scripts/test-scroll-active.ts
 */
import assert from 'node:assert/strict';

function itemDistance(
  item: { left: number; right: number; top: number; bottom: number; width: number; height: number },
  frame: { left: number; right: number; top: number; bottom: number; width: number; height: number },
  horizontal: boolean,
): number | null {
  if (horizontal) {
    if (item.right < frame.left || item.left > frame.right) return null;
  } else if (item.bottom < frame.top || item.top > frame.bottom) {
    return null;
  }
  const ix = item.left + item.width / 2;
  const iy = item.top + item.height / 2;
  if (horizontal) {
    const cx = frame.left + frame.width / 2;
    return Math.abs(ix - cx);
  }
  const cy = frame.top + frame.height / 2;
  return Math.abs(iy - cy);
}

function pickNearest(
  items: Array<ReturnType<typeof rect>>,
  frame: ReturnType<typeof rect>,
  horizontal: boolean,
  incumbentIdx: number | null,
  hysteresisPx: number,
) {
  let best = -1;
  let bestDist = Infinity;
  items.forEach((item, i) => {
    const d = itemDistance(item, frame, horizontal);
    if (d == null) return;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  if (best < 0) return null;
  if (incumbentIdx != null && incumbentIdx !== best) {
    const incDist = itemDistance(items[incumbentIdx], frame, horizontal);
    if (incDist != null && bestDist > incDist - hysteresisPx) return incumbentIdx;
  }
  return best;
}

function rect(left: number, top: number, w: number, h: number) {
  return { left, top, width: w, height: h, right: left + w, bottom: top + h };
}

const frame = rect(0, 0, 300, 400);

// Vertical: item B centered on midY=200
const a = rect(10, 40, 280, 80);
const b = rect(10, 160, 280, 80); // center 200
const c = rect(10, 300, 280, 80);
assert.equal(pickNearest([a, b, c], frame, false, null, 28), 1);

// Hysteresis: stay on B when C only barely closer
const b2 = rect(10, 150, 280, 80); // center 190, dist 10
const c2 = rect(10, 205, 280, 80); // center 245, dist 45 — not closer
assert.equal(pickNearest([a, b2, c2], frame, false, 1, 28), 1);

// Switch when clearly closer
const c3 = rect(10, 170, 280, 80); // center 210, dist 10 vs b2 dist 10 — tie-ish
// Make c clearly win
const farB = rect(10, 40, 280, 80); // center 80, dist 120
const nearC = rect(10, 180, 280, 80); // center 220, dist 20
assert.equal(pickNearest([farB, nearC], frame, false, 0, 28), 1);

// Outside frame ignored
const outside = rect(10, 500, 280, 80);
assert.equal(pickNearest([outside, b], frame, false, null, 28), 1);

// Horizontal
const hFrame = rect(0, 0, 400, 200);
const h1 = rect(20, 20, 100, 160);
const h2 = rect(150, 20, 100, 160); // center 200
const h3 = rect(300, 20, 100, 160);
assert.equal(pickNearest([h1, h2, h3], hFrame, true, null, 28), 1);

console.log('scroll-active math: ok');
