/**
 * Hidden-discovery tracking for the shop.
 * Finds persist per browser so returning visitors keep hunting.
 */
const KEY = 'sm.discoveries.v1';
const TOTAL = 5; // cat, ghost, rabbit, turtle, mushroom

export const FIND_EVENT = 'stereo-mart-find';

function load(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '') || {};
  } catch {
    return {};
  }
}

function save(d: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* private mode */
  }
}

export function discoveryCount() {
  if (typeof window === 'undefined') return 0;
  return Object.keys(load()).length;
}

export function markDiscovery(id: string): boolean {
  const d = load();
  const first = !d[id];
  d[id] = Date.now();
  save(d);
  return first;
}

export function discoveryMessage(id: string, label: string) {
  const first = markDiscovery(id);
  const c = discoveryCount();
  const tally = ` · ${c}/${TOTAL} found`;
  if (first && c === TOTAL) {
    return `you found ${label} — that's all of them. or is it?`;
  }
  return `${first ? 'you found ' : 'hello again, '}${label}${tally}`;
}

export function emitFind(id: string, label: string) {
  if (typeof window === 'undefined') return;
  const message = discoveryMessage(id, label);
  window.dispatchEvent(
    new CustomEvent(FIND_EVENT, { detail: { id, label, message } }),
  );
}
