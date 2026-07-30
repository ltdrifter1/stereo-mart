'use client';

import { useCallback, useEffect, useState } from 'react';
import { isMuted, onMuteChange, setMuted } from '@/lib/audio';

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      className="mute-control-icon"
      width="24"
      height="24"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.5 10.5h3.2L14.8 6.2a1.1 1.1 0 0 1 1.75.9v13.8a1.1 1.1 0 0 1-1.75.9L8.7 17.5H5.5A1.5 1.5 0 0 1 4 16v-4a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="currentColor"
      />
      {muted ? (
        <path
          d="M7.2 7.2L21.5 21.5"
          stroke="#9aabb8"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path
            d="M18.2 11.2a3.6 3.6 0 0 1 0 5.6"
            stroke="#6b8f72"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M20.8 8.6a7 7 0 0 1 0 10.8"
            stroke="#6b8f72"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

/**
 * Speaker mute toggle — frosted chrome plate, classic speaker glyph.
 * Desktop: bottom-right. Mobile: top-right chrome cluster.
 * Fades out during Videos focus instead of unmounting.
 * Starts muted until CLICK TO ENTER unmutes the bus.
 */
export default function MuteControl({
  visible,
  faded = false,
}: {
  visible: boolean;
  /** Hide during CRT video focus (0.3s opacity tween). */
  faded?: boolean;
}) {
  const [muted, setMutedState] = useState(true);

  useEffect(() => {
    setMutedState(isMuted());
    return onMuteChange(setMutedState);
  }, []);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Rely on the bus notify() for UI state — avoids optimistic desync
    // when play() fails under autoplay policy.
    await setMuted(!isMuted());
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`mute-control chrome-fab${muted ? ' is-muted' : ' is-live'}${faded ? ' is-faded' : ''}`}
      onClick={(e) => void toggle(e)}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
      aria-pressed={!muted}
      title={muted ? 'Unmute' : 'Mute'}
      data-cursor="click"
      tabIndex={faded ? -1 : 0}
    >
      <SpeakerIcon muted={muted} />
    </button>
  );
}
