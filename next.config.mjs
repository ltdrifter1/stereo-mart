/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  /**
   * Legacy /shop/*.html product pages are gone. Send every old catalog URL
   * to the thin /shop bridge (App Router), which points into the 360 room.
   */
  async redirects() {
    return [
      {
        source: '/shop/index.html',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/shop/:path*.html',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/shop/',
        destination: '/shop',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
