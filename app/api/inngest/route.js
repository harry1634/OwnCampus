/**
 * app/api/inngest/route.js
 * Inngest serve endpoint.
 *
 * This route handles:
 *   GET  — Inngest introspection (dev server connects here)
 *   POST — Inngest event dispatch / function execution
 *   PUT  — Inngest function registration sync
 *
 * Protected by Inngest's signature verification (INNGEST_SIGNING_KEY).
 * Do NOT add auth middleware to this route.
 */

import { serve } from 'inngest/next'
import { inngest }               from '@/lib/inngest/client'
import { provisionFunction }     from '@/lib/inngest/provision'
import { importStudentsFunction } from '@/lib/inngest/importStudents'

export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: [
    provisionFunction,
    importStudentsFunction,
  ],
})
