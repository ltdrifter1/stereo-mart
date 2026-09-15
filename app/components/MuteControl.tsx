'use client';

import { useCallback, useEffect, useState } from 'react';
import { isMuted, onMuteChange, setMuted } from '@/lib/audio';

/**
 * Speaker mute toggle — BT corner control.
 * Starts muted until CLICK TO ENTER unmutes the bus.
 */
export default function MuteControl({
  visible,
  faded = false,
}: {
  visible: boolean;
  faded?: boolean;
}) {
  const [muted, setMutedState] = useState(true);

  useEffect(() => {
    setMutedState(isMuted());
    return onMuteChange(setMutedState);
  }, []);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await setMuted(!isMuted());
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`mute-control${muted ? ' is-muted' : ' is-live'}${faded ? ' is-faded' : ''}`}
      onClick={(e) => void toggle(e)}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
      aria-pressed={!muted}
      title={muted ? 'Unmute' : 'Mute'}
      data-cursor="click"
      tabIndex={faded ? -1 : 0}
    >
      <img
        className="mute-control-img"
        src={muted ? '/cursors/mute.svg' : '/cursors/unmute.svg'}
        alt=""
        draggable={false}
      />
    </button>
  );
}
