import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { BRAND_FULL, BRAND_NAME, SITE_URL } from '@/lib/brand';
import './globals.css';

/** Single grotesque — balmingtiger Helvetica energy, hangout chrome. */
const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

const siteTitle = BRAND_FULL;
const siteDescription =
  'Club Copy hangout — a digital virtual store. Look around, listen, and stay a while.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    BRAND_FULL,
    BRAND_NAME,
    'hangout',
    'virtual store',
    'house',
    'jungle',
    'instrumental hip-hop',
    'pacific northwest',
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
    description: siteDescription,
    type: 'website',
    url: SITE_URL,
    siteName: siteTitle,
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: `${siteTitle} hangout`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#ece4d2',
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
    <html lang="en" className={sans.variable}>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
