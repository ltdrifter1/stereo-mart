/**
 * Retain-counted canvas hover.
 *
 * Adjacent hotspot meshes fire pointerout/over in either order. A boolean
 * class toggle on each mesh made the click-cursor flicker (or stick off)
 * when crossing from one object to another. Count entries instead.
 */

type Listener = () => void;

let retain = 0;
const labels = new Map<string, string>();
const order: string[] = [];
const listeners = new Set<Listener>();

function notify() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('cursor-hot', retain > 0);
  }
  for (const fn of listeners) fn();
}

export function hoverEnter(id: string, label?: string) {
  retain += 1;
  if (label) {
    labels.set(id, label);
    order.push(id);
  }
  notify();
}

export function hoverLeave(id: string) {
  retain = Math.max(0, retain - 1);
  labels.delete(id);
  for (let i = order.length - 1; i >= 0; i -= 1) {
    if (order[i] === id) order.splice(i, 1);
  }
  notify();
}

export function getHoverLabel(): string | null {
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const label = labels.get(order[i]);
    if (label) return label;
  }
  return null;
}

export function isPointerHot(): boolean {
  return retain > 0;
}

export function subscribePointerHover(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Test / HMR reset. */
export function resetPointerHover() {
  retain = 0;
  labels.clear();
  order.length = 0;
  notify();
}
