/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Reduce console noise in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Disable Fast Refresh console messages
  experimental: {
    optimizePackageImports: ['@vercel/analytics'],
  },
}

export default nextConfig
