/**
 * Section ↔ URL hash helpers for shareable deep links.
 * Example: https://www.stereo-mart.com/#shop
 */
import {
  HASH_BY_SECTION_ID,
  SECTION_ID_BY_HASH,
  SECTION_BY_ID,
} from '@/app/data/sections';

export function sectionIdFromHash(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const slug = raw.trim().toLowerCase();
  if (!slug) return null;
  const id = SECTION_ID_BY_HASH[slug];
  return id && SECTION_BY_ID[id] ? id : null;
}

export function hashFromSectionId(id: string | null | undefined): string {
  if (!id) return '';
  const slug = HASH_BY_SECTION_ID[id];
  return slug ? `#${slug}` : '';
}

/** Read current location hash → section id (or null). */
export function readSectionHash(): string | null {
  if (typeof window === 'undefined') return null;
  return sectionIdFromHash(window.location.hash);
}

/**
 * Sync the URL hash to the active section without scrolling.
 * Uses replaceState while exploring so Back isn't flooded; pushState
 * is handled by the Experience history bridge on user open/close.
 */
export function replaceSectionHash(id: string | null) {
  if (typeof window === 'undefined') return;
  const next = hashFromSectionId(id);
  const url = `${window.location.pathname}${window.location.search}${next}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (url === current) return;
  window.history.replaceState(id ? { sectionId: id } : {}, '', url);
}
