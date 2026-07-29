import type { NavFocusState } from './types';

/**
 * Authoritative focus / panel state for the navigation system.
 * DOM/React layers subscribe; Interaction/Camera never fork their own copy.
 */
export function createNavState(): NavFocusState {
  return {
    activeId: null,
    focusedId: null,
    panelOpen: false,
    focusReadyAt: 0,
  };
}

export function setFocused(
  state: NavFocusState,
  id: string | null,
  opts?: { panel?: boolean; readyDelayMs?: number },
) {
  state.activeId = id;
  state.focusedId = id;
  state.panelOpen = opts?.panel ?? !!id;
  state.focusReadyAt = id
    ? Date.now() + Math.max(0, opts?.readyDelayMs ?? 0)
    : 0;
}

export function clearFocus(state: NavFocusState) {
  state.activeId = null;
  state.focusedId = null;
  state.panelOpen = false;
  state.focusReadyAt = 0;
}

export function isFocusReady(state: NavFocusState) {
  return !!state.focusedId && Date.now() > state.focusReadyAt;
}
