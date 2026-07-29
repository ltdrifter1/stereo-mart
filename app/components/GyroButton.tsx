'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  attachGyro,
  createGyro,
  isGyroLikelyAvailable,
  requestGyroPermission,
  type GyroHandle,
} from '@/lib/gyro';

function GyroIcon({ on }: { on: boolean }) {
  return (
    <svg
      className="gyro-control-icon"
      width="22"
      height="22"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden
    >
      {/* Phone body */}
      <rect
        x="9.5"
        y="4.5"
        width="9"
        height="16"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12.5 18.5h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Tilt motion arcs */}
      <path
        d="M6.2 9.2c-1.4 1.6-1.8 3.6-1.2 5.4"
        stroke={on ? 'var(--gold, #e9b21d)' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={on ? 1 : 0.75}
      />
      <path
        d="M21.8 9.2c1.4 1.6 1.8 3.6 1.2 5.4"
        stroke={on ? 'var(--gold, #e9b21d)' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={on ? 1 : 0.75}
      />
    </svg>
  );
}

/**
 * Mobile motion look — icon chrome (not raw “GYRO” text).
 * Sits in the top-right cluster beside mute on phones.
 * Surfaces a brief tip when iOS denies DeviceOrientation.
 */
export default function GyroButton({
  visible,
  gyroRef,
}: {
  visible: boolean;
  gyroRef: React.MutableRefObject<GyroHandle>;
}) {
  const [show, setShow] = useState(false);
  const [on, setOn] = useState(false);
  const [denyTip, setDenyTip] = useState(false);
  const tipTimer = useRef(0);

  useEffect(() => {
    setShow(visible && isGyroLikelyAvailable());
  }, [visible]);

  useEffect(() => {
    if (!on) return;
    const detach = attachGyro(gyroRef.current);
    gyroRef.current.enabled = true;
    return () => {
      detach();
      gyroRef.current.enabled = false;
      gyroRef.current.yaw = 0;
      gyroRef.current.pitch = 0;
    };
  }, [on, gyroRef]);

  useEffect(() => () => window.clearTimeout(tipTimer.current), []);

  const flashDeny = useCallback(() => {
    setDenyTip(true);
    window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setDenyTip(false), 3200);
  }, []);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (on) {
        setOn(false);
        setDenyTip(false);
        return;
      }
      const ok = await requestGyroPermission();
      if (ok) {
        setOn(true);
        setDenyTip(false);
      } else {
        flashDeny();
      }
    },
    [on, flashDeny],
  );

  if (!show) return null;

  return (
    <>
      <button
        type="button"
        className={`gyro-control chrome-fab${on ? ' is-on' : ''}`}
        onClick={(e) => void toggle(e)}
        onPointerDown={(e) => e.stopPropagation()}
        aria-pressed={on}
        aria-label={on ? 'Turn off motion look' : 'Look with phone tilt'}
        title={on ? 'Motion on' : 'Motion look'}
        data-cursor="click"
      >
        <GyroIcon on={on} />
      </button>
      {denyTip ? (
        <p className="gyro-deny-tip" role="status" aria-live="polite">
          Allow Motion &amp; Orientation in Settings
        </p>
      ) : null}
    </>
  );
}

export { createGyro };
