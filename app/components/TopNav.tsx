'use client';

import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';

import { NAV_ORDER, SECTIONS } from '@/app/data/sections';

const NAV_ITEMS = NAV_ORDER.map((id) => SECTIONS.find((s) => s.id === id)!).filter(Boolean);

/**
 * Conveyor top nav — balmingtiger MENU CONVEYOR pattern.
 *
 * Click path uses Swiper's `clickedRealIndex` (loop-safe). Shop opens the
 * in-room counter panel like every other section (no eject to /shop).
 */
export default function TopNav({
  visible,
  activeId,
  onOpen,
}: {
  visible: boolean;
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  const swiperRef = useRef<SwiperType | null>(null);
  const transitioning = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivateAt = useRef(0);
  const [realIndex, setRealIndex] = useState(0);
  const items = NAV_ITEMS;

  const clearTimers = () => {
    transitioning.current = false;
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const lockTransition = (ms = 900) => {
    transitioning.current = true;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      transitioning.current = false;
      transitionTimer.current = null;
    }, ms);
  };

  // Sync conveyor when a hotspot / panel opens a section.
  useEffect(() => {
    const sw = swiperRef.current;
    if (!sw || !activeId) return;
    const idx = items.findIndex((s) => s.id === activeId);
    if (idx < 0) return;
    if (sw.realIndex === idx) return;
    lockTransition(900);
    sw.slideToLoop(idx, 800);
  }, [activeId, items]);

  useEffect(() => () => clearTimers(), []);

  if (!visible) return null;

  /** Activate a nav item by real index (loop-safe). */
  const activateIndex = (idx: number) => {
    const now = performance.now();
    // React slide onClick + Swiper onClick can both fire — take one.
    if (now - lastActivateAt.current < 450) return;
    lastActivateAt.current = now;

    const section = items[((idx % items.length) + items.length) % items.length];
    if (!section) return;

    const sw = swiperRef.current;
    if (!sw) {
      onOpen(section.id);
      return;
    }

    // Already the active (left) slot — open / toggle immediately.
    if (sw.realIndex === idx) {
      onOpen(section.id);
      return;
    }

    if (transitioning.current) return;

    lockTransition(950);
    sw.slideToLoop(idx, 800);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      clearTimers();
      onOpen(section.id);
    }, 820);
  };

  return (
    <div
      className="top-nav-wrap"
      aria-label="Store sections"
      // Keep stage pan from starting when interacting with the conveyor.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Swiper
        className="top-nav-swiper"
        loop
        // Five nav sections — span the full bar so labels aren’t bunched left.
        slidesPerView={items.length}
        spaceBetween={12}
        speed={800}
        allowTouchMove
        slideToClickedSlide={false}
        watchSlidesProgress
        breakpoints={{
          0: { slidesPerView: items.length, spaceBetween: 6 },
          570: { slidesPerView: items.length, spaceBetween: 10 },
          900: { slidesPerView: items.length, spaceBetween: 14 },
          1200: { slidesPerView: items.length, spaceBetween: 18 },
        }}
        onSwiper={(sw) => {
          swiperRef.current = sw;
          setRealIndex(sw.realIndex);
        }}
        onSlideChange={(sw) => {
          setRealIndex(sw.realIndex);
        }}
        onSlideChangeTransitionEnd={(sw) => {
          transitioning.current = false;
          if (transitionTimer.current) {
            clearTimeout(transitionTimer.current);
            transitionTimer.current = null;
          }
          setRealIndex(sw.realIndex);
          if (sw.realIndex >= items.length) {
            sw.slideToLoop(sw.realIndex % items.length, 0);
          }
        }}
        onClick={(sw) => {
          // Loop clones are outside React — Swiper's clickedRealIndex is authoritative.
          const raw = (sw as SwiperType & { clickedRealIndex?: number }).clickedRealIndex;
          const idx = typeof raw === 'number' ? raw : -1;
          if (idx < 0) return;
          activateIndex(idx);
        }}
      >
        {items.map((s, i) => {
          const open = activeId === s.id;
          const isActiveSlot = realIndex === i;

          return (
            <SwiperSlide key={s.id} className={`top-nav-slide${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className={`top-nav-item${isActiveSlot ? ' is-active-slot' : ''}`}
                aria-label={open && isActiveSlot ? `Close ${s.nav}` : `Open ${s.nav}`}
                aria-current={open ? 'true' : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  activateIndex(i);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="top-nav-label">{s.nav.toUpperCase()}</span>
                <span className="top-nav-line" aria-hidden />
                {open && <span className="top-nav-close">×</span>}
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
