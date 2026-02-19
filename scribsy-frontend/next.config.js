/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    // Proxy backend through Next.js API path in both dev and production to avoid browser CORS issues.
    const backendUrl =
      process.env.BACKEND_URL
      || process.env.NEXT_PUBLIC_API_URL
      || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'https://scribsy-production.up.railway.app');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
