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
  // For static export (if needed for Netlify)
  // output: 'export',
  // trailingSlash: true,
}

export default nextConfig
