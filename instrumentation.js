/**
 * instrumentation.js
 * Next.js 15 instrumentation hook — runs once when the server starts.
 * Initialises Sentry for the correct runtime (Node.js or Edge).
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Sentry v10 captures server-side request errors automatically via
// the server config imported above — no additional export needed here.
