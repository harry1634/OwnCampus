/**
 * lib/logger.js
 * Structured JSON logger backed by Pino.
 * Outputs JSON in production (pipe to Axiom/Datadog/Vercel log drain).
 * Pretty-prints in development when pino-pretty is installed.
 *
 * Usage:
 *   import logger from '@/lib/logger'
 *   logger.info({ userId, institutionId }, 'Student imported')
 *   logger.error({ err, route }, 'Request failed')
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),

  // Stable base fields on every log line
  base: {
    env:     process.env.NODE_ENV     || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    service: 'owncampus-api',
  },

  // ISO timestamp
  timestamp: pino.stdTimeFunctions.isoTime,

  // Rename pino's internal 'level' number to a readable label
  formatters: {
    level(label) { return { level: label } },
  },

  // Serialize Error objects on the `err` key
  serializers: {
    err: pino.stdSerializers.err,
  },
})

export default logger

/**
 * child — create a child logger bound to a specific request context.
 * Call at the top of each API route handler:
 *
 *   const log = child({ route: '/api/students', requestId: req.headers.get('x-request-id'), userId, institutionId })
 */
export function child(bindings) {
  return logger.child(bindings)
}
