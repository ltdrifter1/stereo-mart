/**
 * Nearest-item scroll activation for a single scroll section.
 *
 * Picks at most one eligible item whose visual center is closest to the
 * scroll container’s center. Hysteresis prevents boundary flicker.
 * Mutates `data-scroll-active` on the DOM (no React re-render per frame).
 */

export type ScrollActiveOptions = {
  /** Item selector inside the root (e.g. '.panel-row'). */
  itemSelector: string;
  /** Prefer a nested horizontal scroller when it overflows (mobile catalogs). */
  horizontalSelector?: string;
  /** Extra px a challenger must beat the incumbent by before switching. */
  hysteresisPx?: number;
  /** When false, clears active state and ignores scroll. */
  enabled?: boolean;
  /** Skip visual activation under reduced motion. */
  reducedMotion?: boolean;
};

const DEFAULT_HYSTERESIS = 28;

function isHorizOverflow(el: HTMLElement) {
  return el.scrollWidth > el.clientWidth + 8;
}

function isHorizontalScroller(el: HTMLElement) {
  if (!isHorizOverflow(el)) return false;
  const style = getComputedStyle(el);
  const row = style.flexDirection === 'row' || style.flexDirection === 'row-reverse';
  const ox = style.overflowX;
  return row || ox === 'auto' || ox === 'scroll';
}

function frameFor(root: HTMLElement, horizontalSelector?: string): HTMLElement {
  if (horizontalSelector) {
    const nested = root.querySelector<HTMLElement>(horizontalSelector);
    if (nested && isHorizontalScroller(nested)) return nested;
  }
  return root;
}

function itemDistance(
  item: DOMRect,
  frame: DOMRect,
  horizontal: boolean,
): number | null {
  // Must intersect the visible frame on the scroll axis.
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

export function clearScrollActive(root: HTMLElement, itemSelector: string) {
  root.querySelectorAll<HTMLElement>(`${itemSelector}[data-scroll-active]`).forEach((el) => {
    el.removeAttribute('data-scroll-active');
  });
  root.removeAttribute('data-has-scroll-active');
  const list = root.querySelector<HTMLElement>('[data-scroll-list]');
  list?.removeAttribute('data-has-scroll-active');
}

/**
 * Attach one controller to `root`. Returns a disposer.
 */
export function attachScrollActiveItems(
  root: HTMLElement,
  {
    itemSelector,
    horizontalSelector,
    hysteresisPx = DEFAULT_HYSTERESIS,
    enabled = true,
    reducedMotion = false,
  }: ScrollActiveOptions,
): () => void {
  let raf = 0;
  let incumbent: HTMLElement | null = null;
  let disposed = false;

  const measure = () => {
    raf = 0;
    if (disposed) return;

    if (!enabled || reducedMotion) {
      clearScrollActive(root, itemSelector);
      incumbent = null;
      return;
    }

    const items = Array.from(root.querySelectorAll<HTMLElement>(itemSelector));
    if (items.length === 0) {
      clearScrollActive(root, itemSelector);
      incumbent = null;
      return;
    }

    const frameEl = frameFor(root, horizontalSelector);
    // Nested overflowing list ⇒ horizontal axis; otherwise vertical panel scroll.
    const horizontal = frameEl !== root;
    const frame = frameEl.getBoundingClientRect();

    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    for (const item of items) {
      const d = itemDistance(item.getBoundingClientRect(), frame, horizontal);
      if (d == null) continue;
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    }

    if (!best) {
      if (incumbent) {
        incumbent.removeAttribute('data-scroll-active');
        incumbent = null;
        root.removeAttribute('data-has-scroll-active');
        root
          .querySelector<HTMLElement>('[data-scroll-list]')
          ?.removeAttribute('data-has-scroll-active');
      }
      return;
    }

    if (incumbent && incumbent !== best && incumbent.isConnected) {
      const incDist = itemDistance(
        incumbent.getBoundingClientRect(),
        frame,
        horizontal,
      );
      if (incDist != null && bestDist > incDist - hysteresisPx) {
        best = incumbent;
      }
    }

    if (best === incumbent) return;

    if (incumbent) incumbent.removeAttribute('data-scroll-active');
    best.setAttribute('data-scroll-active', 'true');
    incumbent = best;
    root.setAttribute('data-has-scroll-active', 'true');
    root
      .querySelector<HTMLElement>('[data-scroll-list]')
      ?.setAttribute('data-has-scroll-active', 'true');
  };

  const schedule = () => {
    if (raf || disposed) return;
    raf = requestAnimationFrame(measure);
  };

  const onScroll = () => schedule();
  const onResize = () => schedule();

  root.addEventListener('scroll', onScroll, { passive: true });
  if (horizontalSelector) {
    const nested = root.querySelector<HTMLElement>(horizontalSelector);
    nested?.addEventListener('scroll', onScroll, { passive: true });
  }
  window.addEventListener('resize', onResize, { passive: true });

  // Initial + after panel open height tween (~0.4s) settles.
  schedule();
  const boot = window.setTimeout(schedule, 50);
  const boot2 = window.setTimeout(schedule, 450);

  return () => {
    disposed = true;
    window.clearTimeout(boot);
    window.clearTimeout(boot2);
    if (raf) cancelAnimationFrame(raf);
    root.removeEventListener('scroll', onScroll);
    if (horizontalSelector) {
      root
        .querySelector<HTMLElement>(horizontalSelector)
        ?.removeEventListener('scroll', onScroll);
    }
    window.removeEventListener('resize', onResize);
    clearScrollActive(root, itemSelector);
    incumbent = null;
  };
}
