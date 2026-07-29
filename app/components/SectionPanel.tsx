'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import gsap from 'gsap';

import { SECTION_BY_ID, type SectionItem } from '@/app/data/sections';
import { attachScrollActiveItems } from '@/lib/scrollActiveItems';
import {
  onPreviewProgress,
  playPreview,
  seekPreview,
  stopPreview,
  type PreviewProgress,
} from '@/lib/audio';

function canNest(item: SectionItem) {
  return Boolean(
    item.tracks?.length || item.listenOn?.length || item.previewSrc || item.body,
  );
}

function outboundLinks(item: SectionItem) {
  return (item.listenOn ?? []).filter((l) => l.href && !l.href.startsWith('#'));
}

function listenHref(item: SectionItem) {
  const links = outboundLinks(item);
  const listen = links.find((l) => /listen|bandcamp|spotify|apple/i.test(l.label));
  return listen?.href ?? links.find((l) => l.href !== item.href)?.href ?? links[0]?.href;
}

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input[type="range"]';

const MOBILE_MQ = '(max-width: 570px)';

/**
 * Diegetic listening nest — CRT parity for Music/Shop.
 * Hero cover + transport + living progress; tracklist sits under the ceremony.
 */
function DetailBody({
  sectionId,
  detail,
  progress,
  onTogglePreview,
}: {
  sectionId: string;
  detail: SectionItem;
  progress: PreviewProgress;
  onTogglePreview: () => void;
}) {
  const links = outboundLinks(detail).filter((l) => /buy/i.test(l.label));
  const buyHref =
    links[0]?.href ??
    (detail.href && !detail.href.startsWith('#') ? detail.href : null);
  const buyLinks = links.length
    ? links
    : buyHref
      ? [{ label: 'Buy Now', href: buyHref }]
      : [];
  const selfTitled =
    Boolean(detail.meta?.trim()) &&
    detail.meta!.trim().toLowerCase() === detail.label.trim().toLowerCase();
  const hasPreview = Boolean(detail.previewSrc);
  const playing =
    hasPreview && progress.src === detail.previewSrc && progress.playing;
  const loaded = hasPreview && progress.src === detail.previewSrc;
  const duration = loaded ? progress.duration : 0;
  const current = loaded ? progress.currentTime : 0;
  const pct = duration > 0 ? Math.min(1, current / duration) : 0;

  // Light up a track row while the booth is live — singles always; short
  // previews highlight the lead cut as the “on the speakers” stand-in.
  const liveTrack =
    !playing || !detail.tracks?.length
      ? -1
      : detail.tracks.length === 1 || duration > 0
        ? 0
        : -1;

  return (
    <div
      className={`panel-listen-nest${playing ? ' is-live' : ''}${hasPreview ? ' has-transport' : ''}`}
    >
      <p className="panel-kicker panel-kicker-live">
        {playing ? 'Now playing' : (SECTION_BY_ID[sectionId]?.kicker ?? 'Detail')}
      </p>
      <h2 className="panel-title panel-title-sm">{detail.label}</h2>
      {detail.meta && !selfTitled ? (
        <p className="panel-intro">
          {detail.meta}
          {detail.detail ? ` · ${detail.detail}` : ''}
        </p>
      ) : detail.detail && !selfTitled ? (
        <p className="panel-intro">{detail.detail}</p>
      ) : null}

      {detail.thumbSrc && (
        <div
          className={`panel-detail-art${playing ? ' is-spinning' : ''}${loaded && !playing ? ' is-paused' : ''}`}
          aria-hidden
        >
          <div className="panel-detail-art-ring" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={detail.thumbSrc} alt="" width={168} height={168} />
        </div>
      )}

      {detail.body && <p className="panel-body">{detail.body}</p>}

      {hasPreview && (
        <div className="panel-transport" role="group" aria-label="Booth preview">
          <button
            type="button"
            className={`panel-transport-play${playing ? ' is-playing' : ''}`}
            onClick={onTogglePreview}
            data-cursor="click"
            aria-pressed={playing}
            aria-label={playing ? 'Pause preview' : 'Play preview'}
          >
            <span className="panel-transport-icon" aria-hidden>
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <rect x="3" y="2" width="4" height="14" rx="1" />
                  <rect x="11" y="2" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <path d="M4.5 2.8v12.4L15 9 4.5 2.8z" />
                </svg>
              )}
            </span>
            <span className="panel-transport-label">
              {playing ? 'Pause' : loaded ? 'Resume' : 'Play'}
            </span>
          </button>

          <div className="panel-transport-meter">
            <input
              type="range"
              className="panel-transport-range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(pct * 1000)}
              disabled={!loaded || duration <= 0}
              aria-label="Seek preview"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(current)}
              aria-valuetext={`${fmtTime(current)} of ${fmtTime(duration)}`}
              onChange={(e) => {
                if (!duration) return;
                seekPreview((Number(e.target.value) / 1000) * duration);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              data-cursor="click"
              style={{ ['--seek' as string]: `${pct * 100}%` }}
            />
            <div className="panel-transport-times">
              <span>{fmtTime(current)}</span>
              <span>{duration > 0 ? fmtTime(duration) : '—:—'}</span>
            </div>
          </div>
        </div>
      )}

      {detail.tracks && detail.tracks.length > 0 && (
        <ul className="panel-tracks">
          {detail.tracks.map((t, i) => (
            <li key={i} className={liveTrack === i ? 'is-active' : undefined}>
              <span>{t.title}</span>
              {t.duration && <span className="track-dur">{t.duration}</span>}
            </li>
          ))}
        </ul>
      )}

      {buyLinks.length > 0 && (
        <div className="panel-listen">
          <div className="panel-cta-wrap">
            {buyLinks.map((l) => (
              <a
                key={l.label}
                className="panel-cta panel-cta-buy"
                href={l.href}
                target={l.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={l.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                data-cursor="click"
                onClick={(e) => e.stopPropagation()}
              >
                Buy Now
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Glass menu panel — balmingtiger `.menu-panel` pattern:
 * left-docked frosted glass, thumb rows + CTA pills, music/shop nested detail.
 *
 * Mobile (≤570px): nest opens as a dedicated bottom sheet (BT level-2-mobile),
 * covering the tray so tracklists / buy pills aren’t cramped.
 */
export default function SectionPanel({
  activeId,
  onClose,
  onPlayCrt,
  crtSrc = null,
  crtArmed = false,
  reduceMotion = false,
}: {
  activeId: string | null;
  onClose: () => void;
  /** Play a local video on the in-room CRT (Videos section). */
  onPlayCrt?: (src: string) => void;
  /** Current CRT channel URL — drives “Now on the tube” live state. */
  crtSrc?: string | null;
  /** True once Videos lookto has armed the tube. */
  crtArmed?: boolean;
  reduceMotion?: boolean;
}) {
  const [shownId, setShownId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SectionItem | null>(null);
  const [progress, setProgress] = useState<PreviewProgress>({
    src: null,
    playing: false,
    currentTime: 0,
    duration: 0,
  });
  const [isMobile, setIsMobile] = useState(false);
  const level1 = useRef<HTMLDivElement>(null);
  const level2 = useRef<HTMLDivElement>(null);
  const nestSheet = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const backBtn = useRef<HTMLButtonElement>(null);
  const nestBackBtn = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoPlayedFor = useRef<string | null>(null);

  useEffect(() => onPreviewProgress(setProgress), []);

  // Auto-drop the needle when opening a release with a booth preview.
  useEffect(() => {
    const src = detail?.previewSrc;
    if (!src) {
      autoPlayedFor.current = null;
      return;
    }
    if (autoPlayedFor.current === src) return;
    autoPlayedFor.current = src;
    void playPreview(src);
  }, [detail]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);

    if (activeId) {
      setShownId(activeId);
      setDetail(null);
      const raf = requestAnimationFrame(() => {
        setOpen(true);
        backBtn.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(raf);
    }

    setOpen(false);
    setDetail(null);
    stopPreview();
    closeTimer.current = setTimeout(() => setShownId(null), reduceMotion ? 0 : 720);
  }, [activeId, reduceMotion]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detail) {
          setDetail(null);
          stopPreview();
        } else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, detail, onClose]);

  // Focus trap — desktop: panel; mobile nest: sheet; else panel.
  useEffect(() => {
    if (!open || !activeId) return;
    const root: HTMLElement | null =
      isMobile && detail ? nestSheet.current : panelRef.current;
    if (!root) return;

    const onTab = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onTab, true);
    return () => window.removeEventListener('keydown', onTab, true);
  }, [open, activeId, detail, isMobile]);

  // Desktop: nest fades inside the panel. Mobile: sheet slides up separately.
  useEffect(() => {
    const a = level1.current;
    const b = level2.current;
    const sheet = nestSheet.current;
    const dur = reduceMotion ? 0 : 0.35;
    const dur2 = reduceMotion ? 0 : 0.4;

    if (isMobile) {
      // Keep level-1 fully visible under the sheet.
      if (a) gsap.set(a, { opacity: 1 });
      if (b) gsap.set(b, { opacity: 0 });
      if (sheet) {
        if (detail) {
          gsap.fromTo(
            sheet,
            { opacity: 0, y: reduceMotion ? 0 : 28 },
            {
              opacity: 1,
              y: 0,
              duration: dur2,
              ease: 'power2.out',
              overwrite: true,
            },
          );
          nestBackBtn.current?.focus({ preventScroll: true });
        } else {
          gsap.set(sheet, { opacity: 0, y: 16 });
          backBtn.current?.focus({ preventScroll: true });
        }
      }
      return;
    }

    if (!a) return;
    if (detail) {
      gsap.to(a, { opacity: 0, duration: dur, ease: 'power1.inOut', overwrite: true });
      if (b) {
        gsap.fromTo(
          b,
          { opacity: 0 },
          { opacity: 1, duration: dur2, ease: 'power1.inOut', overwrite: true },
        );
      }
    } else {
      gsap.to(a, { opacity: 1, duration: dur, ease: 'power1.inOut', overwrite: true });
      if (b) gsap.set(b, { opacity: 0 });
    }
  }, [detail, reduceMotion, isMobile]);

  // One scroll-active controller for the level-1 item list.
  useEffect(() => {
    const root = level1.current;
    if (!root || !open || !shownId) return;
    // On desktop, pause while nested; on mobile the tray stays usable under the sheet.
    if (detail && !isMobile) return;

    return attachScrollActiveItems(root, {
      itemSelector: '.panel-row',
      horizontalSelector: '[data-scroll-list]',
      enabled: true,
      reducedMotion: reduceMotion,
      hysteresisPx: 28,
    });
  }, [open, shownId, detail, reduceMotion, isMobile]);

  const section = shownId ? SECTION_BY_ID[shownId] : null;
  // Sections whose rows open the in-panel detail nest (previews / tracks).
  const nestable =
    section?.id === 'cash-register' || section?.id === 'listening-booth';
  const channelGuide = section?.id === 'crt-tv';
  const artistPanel = section?.id === 'record-bins';
  const contactPanel = section?.id === 'phone-booth';
  const shopPanel = section?.id === 'cash-register';
  const musicPanel = section?.id === 'listening-booth';
  // One shared section title scale for every browse panel (Music → Contact).
  const heroKicker = Boolean(section?.kicker?.trim() && !section.title?.trim());

  const handleBack = () => {
    if (detail) {
      setDetail(null);
      stopPreview();
      return;
    }
    onClose();
  };

  const openOutbound = (href: string) => {
    if (href.startsWith('mailto:')) {
      window.location.href = href;
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const openItem = (item: SectionItem) => {
    if (nestable && canNest(item)) {
      setDetail(item);
      return;
    }
    if (item.videoSrc && onPlayCrt) {
      onPlayCrt(item.videoSrc);
      return;
    }
    if (!item.href) return;
    openOutbound(item.href);
  };

  const onRowKey = (e: KeyboardEvent<HTMLElement>, item: SectionItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openItem(item);
    }
  };

  const togglePreview = () => {
    if (!detail?.previewSrc) return;
    void playPreview(detail.previewSrc);
  };

  const desktopNest = Boolean(detail && !isMobile);
  const mobileNest = Boolean(detail && isMobile);

  let nestDetail: ReactNode = null;
  if (detail && section) {
    nestDetail = (
      <DetailBody
        sectionId={section.id}
        detail={detail}
        progress={progress}
        onTogglePreview={togglePreview}
      />
    );
  }

  return (
    <div
      className={`panel-root ${open ? 'open' : ''}${mobileNest ? ' has-mobile-nest' : ''}`}
      style={{ display: section ? 'block' : 'none' }}
      aria-hidden={!open}
    >
      <div className="panel-scrim" aria-hidden />
      <aside
        ref={panelRef}
        className={`panel${desktopNest ? ' has-detail' : ''}${mobileNest ? ' is-nesting' : ''}${contactPanel ? ' is-contact' : ''}${shopPanel ? ' is-shop' : ''}`}
        style={
          section
            ? ({ ['--panel-accent' as string]: section.accent } as React.CSSProperties)
            : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-label={section?.title || section?.kicker || section?.nav}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <button
          ref={backBtn}
          className="panel-back"
          onClick={handleBack}
          aria-label="Back"
          data-cursor="click"
        >
          Back
        </button>

        {section && (
          <>
            <div className="panel-level panel-level-1" ref={level1}>
              {section.kicker ? (
                <p className={`panel-kicker${heroKicker ? ' is-hero' : ''}`}>
                  {section.kicker}
                </p>
              ) : null}
              {section.title ? (
                <h2 className="panel-title">{section.title}</h2>
              ) : null}
              {section.intro ? (
                <p className="panel-intro">{section.intro}</p>
              ) : null}

              {section.items.length === 0 ? (
                <p className="panel-intro panel-coming-soon">Coming soon.</p>
              ) : (
                <div
                  className={`panel-list${artistPanel ? ' panel-list--artist' : ''}${nestable ? ' panel-list--shelf' : ''}${channelGuide ? ' panel-list--channels' : ''}${contactPanel ? ' panel-list--contact' : ''}`}
                  role="list"
                  data-scroll-list
                >
                  {section.items.map((it, i) => {
                    const onTube =
                      channelGuide &&
                      Boolean(crtArmed && it.videoSrc && it.videoSrc === crtSrc);
                    const shelfLike = nestable || channelGuide;
                    const shopListen = shopPanel ? listenHref(it) : null;
                    return (
                      <article
                        key={i}
                        className={`panel-row${artistPanel ? ' panel-row--artist' : ''}${nestable ? ' panel-row--shelf' : ''}${shopPanel ? ' panel-row--shop' : ''}${channelGuide ? ' panel-row--channel' : ''}${contactPanel ? ' panel-row--contact' : ''}${onTube ? ' is-on-air' : ''}${detail === it ? ' is-selected' : ''}`}
                        role="listitem"
                        tabIndex={0}
                        data-cursor="click"
                        aria-label={`${it.label}${!channelGuide && it.meta ? ` — ${it.meta}` : ''}${onTube ? ' — playing' : ''}`}
                        aria-current={onTube || detail === it ? 'true' : undefined}
                        onClick={() => openItem(it)}
                        onKeyDown={(e) => onRowKey(e, it)}
                      >
                        <div
                          className={`panel-thumb${it.thumbSrc ? ' has-art' : ''}${shelfLike ? ' panel-thumb--shelf' : ''}${contactPanel ? ' panel-thumb--contact' : ''}`}
                          style={
                            it.thumbSrc
                              ? undefined
                              : {
                                  background: `color-mix(in srgb, ${section.accent} 55%, #1a1410)`,
                                }
                          }
                          aria-hidden
                        >
                          {it.thumbSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.thumbSrc}
                              alt=""
                              width={shelfLike ? 132 : contactPanel ? 64 : 72}
                              height={shelfLike ? 132 : contactPanel ? 64 : 72}
                              loading="lazy"
                            />
                          ) : (
                            <span>{it.thumb ?? String(i + 1).padStart(2, '0')}</span>
                          )}
                        </div>
                        <div className="panel-row-body">
                          <span className="pc-label">{it.label}</span>
                          {!channelGuide && it.meta ? (
                            <span className={`pc-meta${artistPanel ? ' pc-location' : ''}`}>
                              {it.meta}
                            </span>
                          ) : null}
                          {shelfLike && !shopPanel && !musicPanel && !channelGuide && it.body ? (
                            <p className="pc-blurb">{it.body}</p>
                          ) : null}
                          {artistPanel && it.href && it.detail ? (
                            <a
                              className="pc-outbound"
                              href={it.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-cursor="click"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              {it.detail}
                            </a>
                          ) : null}
                          {musicPanel && it.tracks?.length ? (
                            <span className="pc-detail">
                              {it.tracks.length}{' '}
                              {it.tracks.length === 1 ? 'track' : 'tracks'}
                            </span>
                          ) : null}
                          {!artistPanel &&
                          !channelGuide &&
                          !shopPanel &&
                          !musicPanel &&
                          it.detail ? (
                            <span className="pc-detail">{it.detail}</span>
                          ) : null}
                          {!artistPanel && !nestable && !channelGuide && it.cta ? (
                            <div className="panel-cta-wrap">
                              <span className="panel-cta">{it.cta}</span>
                            </div>
                          ) : null}
                          {shopPanel ? (
                            <div className="panel-cta-wrap">
                              {it.href ? (
                                <a
                                  className="panel-cta panel-cta-buy"
                                  href={it.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  data-cursor="click"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  Buy Now
                                </a>
                              ) : null}
                              <button
                                type="button"
                                className="panel-cta panel-cta-secondary"
                                data-cursor="click"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (it.previewSrc || it.tracks?.length) {
                                    setDetail(it);
                                    return;
                                  }
                                  if (shopListen) openOutbound(shopListen);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                Listen
                              </button>
                            </div>
                          ) : null}
                          {nestable && !shopPanel && (
                            <span className="pc-shelf-hint" aria-hidden>
                              {musicPanel
                                ? 'Listen now'
                                : it.previewSrc
                                  ? 'Step in to listen'
                                  : 'Open'}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop nest — stays inside the left glass panel */}
            <div className="panel-level panel-level-2" ref={level2} aria-hidden={!desktopNest}>
              {desktopNest ? nestDetail : null}
            </div>
          </>
        )}
      </aside>

      {/* Mobile nest sheet — BT level-2-mobile principle, STEREO-MART styling */}
      {mobileNest && section && detail && (
        <div
          ref={nestSheet}
          className="panel-nest-sheet"
          style={{ ['--panel-accent' as string]: section.accent } as React.CSSProperties}
          role="dialog"
          aria-modal="true"
          aria-label={detail.label}
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <button
            ref={nestBackBtn}
            type="button"
            className="panel-back panel-nest-back"
            onClick={handleBack}
            aria-label="Back"
            data-cursor="click"
          >
            Back
          </button>
          <div className="panel-nest-inner">{nestDetail}</div>
        </div>
      )}
    </div>
  );
}
