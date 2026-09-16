'use client';

import { ROOM_HOTSPOTS } from '@/app/data/hotspots';
import { setSilhouetteKeyboard, type SilhouetteName } from '@/lib/silhouetteGlow';

/**
 * Keyboard path for in-world objects. Buttons stay visually hidden until
 * focused; the sphere silhouette is the in-world focus ring.
 */
export default function HotspotA11y({
  visible,
  onOpen,
  onToggleLights,
}: {
  visible: boolean;
  onOpen: (id: string) => void;
  onToggleLights?: () => void;
}) {
  if (!visible) return null;
  return (
    <nav className="hotspot-a11y" aria-label="Shop objects">
      {ROOM_HOTSPOTS.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => onOpen(h.id)}
          onFocus={() => setSilhouetteKeyboard(h.id as SilhouetteName, 0.42)}
          onBlur={() => setSilhouetteKeyboard(h.id as SilhouetteName, 0)}
        >
          {h.object}
        </button>
      ))}
      {onToggleLights && (
        <button
          type="button"
          onClick={onToggleLights}
          onFocus={() => setSilhouetteKeyboard('lamp', 0.42)}
          onBlur={() => setSilhouetteKeyboard('lamp', 0)}
        >
          Desk lamp
        </button>
      )}
    </nav>
  );
}
