/** @type {import('next').NextConfig} */
const DEFAULT_DEV_BACKEND = "http://127.0.0.1:8000";
const DEFAULT_PROD_BACKEND = "https://scribsy-production.up.railway.app";
function resolveBackendUrl() {
  const configured = (process.env.BACKEND_URL || "").trim();
  if (configured) return configured;
  const publicUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  const isFrontend = /vercel\.app$/i.test(
    publicUrl.replace(/^https?:\/\//, "").split("/")[0] || "",
  );
  if (publicUrl && !isFrontend) return publicUrl;
  return process.env.NODE_ENV === "development"
    ? DEFAULT_DEV_BACKEND
    : DEFAULT_PROD_BACKEND;
}

const nextConfig = {
  outputFileTracingIncludes: { "/api/demo/*": ["./public/fonts/*.ttf"] },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

nextConfig.rewrites = async () => [
  {
    source: "/api/:path((?!demo(?:/|$)).*)",
    destination: `${resolveBackendUrl()}/:path`,
  },
];
module.exports = nextConfig;
