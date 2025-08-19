/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true
  },
  // Note: Headers don't work with static export, but keeping for reference
  // If you need these headers, consider deploying to Vercel/Netlify instead
  ...(process.env.NODE_ENV === 'development' && {
    async headers() {
      return [
        // Allow manifest.json and other static files to be accessed cross-origin
        {
          source: '/manifest.json',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: '*',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'X-Requested-With, content-type, Authorization',
            },
          ],
        },
        // Allow all static files in public directory to be accessed cross-origin
        {
          source: '/:path*\\.(ico|png|jpg|jpeg|gif|svg|webp|json)',
          headers: [
            {
              key: 'Access-Control-Allow-Origin',
              value: '*',
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type',
            },
          ],
        },
        // Allow the app to be embedded in iframes (for Safe Apps)
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN',
            },
            {
              key: 'Content-Security-Policy',
              value: "frame-ancestors 'self' https://app.safe.global https://*.safe.global;",
            },
          ],
        },
      ]
    }
  }),
}

module.exports = nextConfig
