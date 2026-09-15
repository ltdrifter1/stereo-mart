import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_FULL, BRAND_LINE, BRAND_NAME, SITE_URL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Shop — ${BRAND_FULL}`,
  description:
    `Browse inside the ${BRAND_FULL} hangout. Listen, preview, and buy without leaving the room.`,
  alternates: { canonical: `${SITE_URL}/shop` },
};

/**
 * Thin brand bridge for /shop URLs and SEO.
 * Primary commerce lives in the hangout (#shop).
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
          The catalog lives inside the hangout. Step in, look around, and
          open the library from the floor.
        </p>

        <div className="shop-bridge-actions">
          <Link href="/#shop" className="shop-bridge-cta" data-cursor="click">
            Enter the hangout
          </Link>
          <Link href="/#music" className="shop-bridge-link" data-cursor="click">
            Music
          </Link>
          <Link href="/#contact" className="shop-bridge-link" data-cursor="click">
            Contact
          </Link>
        </div>
      </main>
    </div>
  );
}
