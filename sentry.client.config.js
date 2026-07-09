/**
 * sentry.client.config.js
 * Browser-side Sentry initialisation.
 * Loaded automatically by @sentry/nextjs when the app boots in the browser.
 *
 * Required env var (public):
 *   NEXT_PUBLIC_SENTRY_DSN  — from Sentry project settings → Client Keys
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,
  release:     process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',

  // 10% of transactions in production — increase on the Sentry dashboard if needed
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay captures 1% of sessions and 100% of sessions with an error
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask PII: all text and input values are replaced with ***
      maskAllText:   true,
      blockAllMedia: true,
    }),
  ],

  // Do not send events in local development unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
