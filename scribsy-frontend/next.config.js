/** @type {import('next').NextConfig} */
const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:8000'
const DEFAULT_PROD_BACKEND = 'https://scribsy-production.up.railway.app'

function resolveBackendUrl() {
  const envBackend = (process.env.BACKEND_URL || '').trim()
  if (envBackend) return envBackend

  // Guard against accidental use of frontend/public URLs as backend proxy targets.
  // NEXT_PUBLIC_API_URL may point at a Vercel frontend deployment which can return
  // HTML auth interstitials instead of JSON API responses.
  const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim()
  const looksLikeVercelFrontend = /vercel\.app$/i.test(publicApiUrl.replace(/^https?:\/\//, '').split('/')[0] || '')
  if (publicApiUrl && !looksLikeVercelFrontend) {
    return publicApiUrl
  }

  return process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BACKEND : DEFAULT_PROD_BACKEND
}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backendUrl = resolveBackendUrl()

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
