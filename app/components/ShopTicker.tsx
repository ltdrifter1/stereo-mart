'use client';

import { useEffect, useState } from 'react';
import { onPreviewProgress } from '@/lib/audio';

const LOOP = [
  'DIG THE CRATES',
  'DROP THE NEEDLE',
  'PLAY IT LOUD',
  'OPEN LATE',
  'STEREO-MART RECORDS',
  'ALWAYS SPINNING',
];

/**
 * Record-shop cousin of BT’s “JUST FUN / LOOP” — a looping LED marquee.
 * Swaps to NOW PLAYING while a booth preview is live.
 */
export default function ShopTicker({
  visible,
  panelOpen,
}: {
  visible: boolean;
  panelOpen: boolean;
}) {
  const [nowPlaying, setNowPlaying] = useState(false);

  useEffect(() => {
    return onPreviewProgress((p) => setNowPlaying(Boolean(p.src && p.playing)));
  }, []);

  if (!visible) return null;

  const items = nowPlaying
    ? ['NOW PLAYING', 'LISTENING STATION', 'DROP THE NEEDLE', 'NOW PLAYING']
    : LOOP;
  const line = items.concat(items).join('  ·  ');

  return (
    <div
      className={`shop-ticker${panelOpen ? ' is-tucked' : ''}${nowPlaying ? ' is-live' : ''}`}
      aria-hidden
    >
      <div className="shop-ticker-track">
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}
