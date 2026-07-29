import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_FULL, BRAND_LINE, BRAND_NAME, SITE_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Shop — ${BRAND_FULL}`,
  description:
    `Browse New Releases inside the ${BRAND_FULL} 360° store. Listen, preview, and buy without leaving the room.`,
  alternates: { canonical: `${SITE_URL}/shop` },
};

/**
 * Thin brand bridge for legacy /shop URLs and SEO.
 * Primary commerce lives in the 360° room (#shop) — this page only
 * invites visitors back into that experience.
 */
export default function ShopBridgePage() {
  return (
    <div className="shop-bridge">
      <div className="shop-bridge-atmosphere" aria-hidden>
        <span className="shop-bridge-mist shop-bridge-mist-a" />
        <span className="shop-bridge-mist shop-bridge-mist-b" />
        <span className="shop-bridge-grain" />
      </div>

      <main className="shop-bridge-inner">
        <p className="shop-bridge-kicker">{BRAND_FULL}</p>
        <h1 className="shop-bridge-mark">
          {BRAND_NAME}
          <span className="shop-bridge-mark-line">{BRAND_LINE}</span>
        </h1>
        <p className="shop-bridge-lede">
          The catalog lives inside the store now. Step in, look around, and
          open New Releases at the counter.
        </p>

        <div className="shop-bridge-actions">
          <Link href="/#shop" className="shop-bridge-cta" data-cursor="click">
            Enter the store
          </Link>
          <Link href="/#music" className="shop-bridge-link" data-cursor="click">
            Music
          </Link>
          <Link href="/#contact" className="shop-bridge-link" data-cursor="click">
            Contact
          </Link>
        </div>

        <ul className="shop-bridge-list" aria-label="Quick links">
          <li>
            <a
              href="https://inletknight.bandcamp.com/album/inlet-knight"
              target="_blank"
              rel="noopener noreferrer"
            >
              Inlet Knight — self-titled album
            </a>
          </li>
          <li>
            <a
              href="https://inletknight.bandcamp.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Inlet Knight on Bandcamp
            </a>
          </li>
          <li>
            <a
              href="https://ltdrifta.bandcamp.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              LT Drifta on Bandcamp
            </a>
          </li>
        </ul>
      </main>
    </div>
  );
}
