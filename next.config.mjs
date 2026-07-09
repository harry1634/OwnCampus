import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options',           value: 'DENY' },
        { key: 'X-Content-Type-Options',    value: 'nosniff' },
        { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://images.unsplash.com",
            // Supabase REST + Realtime + Sentry error reporting
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://o*.ingest.sentry.io",
            "font-src 'self' data:",
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ],
    },
  ],
}

// withSentryConfig wraps the config to enable source-map upload to Sentry in CI.
// silent:true prevents network-hang on builds without SENTRY_AUTH_TOKEN.
// Source maps are only uploaded when SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT
// are all set (the plugin detects missing credentials and skips automatically).
export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG     || '',
  project: process.env.SENTRY_PROJECT || '',

  // Always silent so missing credentials never block a local build
  silent: true,

  // Only upload source maps when explicitly enabled
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  hideSourceMaps: true,
})
