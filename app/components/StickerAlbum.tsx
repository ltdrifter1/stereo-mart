'use client';

import { useEffect, useState } from 'react';

import { FIND_EVENT, discoveryCount, foundIds } from '@/lib/discoveries';

const SLOTS = [
  { id: 'cat', glyph: '🐱' },
  { id: 'ghost', glyph: '👻' },
  { id: 'rabbit', glyph: '🐰' },
  { id: 'turtle', glyph: '🐢' },
  { id: 'mushroom', glyph: '🍄' },
] as const;

/**
 * Sticker book of hidden finds — BT rabbit-hole collecting, record-shop form.
 * Fills as the visitor pokes the cat, stickers, ghost, and mushroom.
 */
export default function StickerAlbum({ active }: { active: boolean }) {
  const [found, setFound] = useState<Set<string>>(new Set());
  const [pop, setPop] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    setFound(new Set(foundIds()));
    setCount(discoveryCount());
    const onFind = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      setFound((prev) => new Set(prev).add(detail.id));
      setPop(detail.id);
      setCount(discoveryCount());
      window.setTimeout(() => setPop((cur) => (cur === detail.id ? null : cur)), 900);
    };
    window.addEventListener(FIND_EVENT, onFind);
    return () => window.removeEventListener(FIND_EVENT, onFind);
  }, [active]);

  if (!active || count === 0) return null;

  return (
    <div className="sticker-album" aria-label={`${count} of ${SLOTS.length} shop finds`}>
      <span className="sticker-album-kicker">Finds {count}/{SLOTS.length}</span>
      <div className="sticker-album-row">
        {SLOTS.map((s) => {
          const on = found.has(s.id);
          return (
            <span
              key={s.id}
              className={`sticker-slot${on ? ' is-found' : ''}${pop === s.id ? ' is-pop' : ''}`}
              aria-hidden
            >
              {on ? s.glyph : '·'}
            </span>
          );
        })}
      </div>
    </div>
  );
}
