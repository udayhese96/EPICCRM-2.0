/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Force dynamic rendering for pages that use localStorage or client-side features
  experimental: {
    missingSuspenseWithCSRBailout: false,
    optimizePackageImports: ['@vercel/analytics'],
  },
  
  // Strip console.* in production builds except errors
  compiler: {
    removeConsole: { exclude: ['error'] },
  },
  
  // Ignore TypeScript and ESLint errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image optimization settings
  images: {
    unoptimized: true,
  },
  
  // Reduce console noise in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Ensure API routes are treated as serverless functions
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
}

export default nextConfig
