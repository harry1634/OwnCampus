/**
 * sentry.server.config.js
 * Node.js server-side Sentry initialisation.
 * Loaded via instrumentation.js on the Node.js runtime.
 *
 * Required env var (server-only):
 *   SENTRY_DSN — same DSN as the client, but kept server-only so it isn't
 *                bundled into the browser payload. Falls back to NEXT_PUBLIC_SENTRY_DSN.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release:     process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',

  // 10% of server transactions sampled in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture unhandled promise rejections and uncaught exceptions
  autoSessionTracking: true,

  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
})
