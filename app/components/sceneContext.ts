'use client';

import { createContext, useContext } from 'react';
import type { Controls, Vec2 } from '@/lib/navigation/types';

export type { Controls, Vec2 };

export type SceneEnv = {
  look: Vec2;
  time: number;
  /** Hotspots / hints live only after intro unlocks look. */
  live: { value: boolean };
  panelOpen: { value: boolean };
  reduceMotion: boolean;
  /** Glow latch id — follow-mouse lean stays off while set. */
  focusedId: { value: string | null };
  /**
   * Post-settle boost window — stronger idle breath until this
   * performance.now() timestamp (0 = off). After it ends, idle glow
   * continues at the quieter always-on floor.
   */
  inviteUntil: { value: number };
  /** Booth preview is actively playing — Music hotspot pulses like the CRT. */
  listening: { value: boolean };
};

export const SceneContext = createContext<SceneEnv | null>(null);

export function useSceneEnv(): SceneEnv {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useSceneEnv must be used within SceneContext');
  return ctx;
}
