import type { Metadata, Viewport } from 'next';
import { Syne, Sora } from 'next/font/google';
import { BRAND_FULL, BRAND_NAME, SITE_URL } from '@/lib/brand';
import './globals.css';

/** Expressive editorial display — brand mark (gate / panel titles). */
const display = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
});

/** Clean geometric sans — balmingtiger-style floating chrome. */
const body = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const siteTitle = BRAND_FULL;
const siteDescription =
  'Step inside Stereo-Mart Records — an immersive 360° underground warehouse record shop. Look around, explore, and discover.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    BRAND_FULL,
    BRAND_NAME,
    'record store',
    'vinyl',
    'immersive',
    'indie',
    'crate digging',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteTitle,
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: siteTitle,
    description: 'An interactive 360° record store. Look around, explore, discover.',
    type: 'website',
    url: SITE_URL,
    siteName: siteTitle,
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: `${siteTitle} — illustrated record store`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: 'An interactive 360° record store. Look around, explore, discover.',
    images: ['/og.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1c1e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
