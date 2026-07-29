'use client';

import dynamic from 'next/dynamic';

// The entire experience is WebGL + pointer driven, so it only ever runs in the
// browser. Disabling SSR keeps three.js out of the server bundle and lets us
// stream the heavy scene in after first paint.
const Experience = dynamic(() => import('./components/Experience'), {
  ssr: false,
});

export default function Home() {
  return <Experience />;
}
