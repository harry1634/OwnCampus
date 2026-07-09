/**
 * GET /api/health
 * System health check endpoint.
 *
 * Returns 200 when all critical services are reachable,
 * or 503 with a partial status when any service is degraded.
 *
 * Suitable for:
 *   - Uptime monitoring (BetterStack / UptimeRobot)
 *   - Kubernetes / load balancer liveness checks
 *   - On-call runbook first step
 *
 * Does NOT require authentication — must remain publicly accessible.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const START_TIME = Date.now()

export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkStorage(),
    checkAuth(),
  ])

  const [db, storage, auth] = checks.map(r =>
    r.status === 'fulfilled' ? r.value : { ok: false, error: r.reason?.message || 'unknown' }
  )

  // Realtime is a WebSocket — we only verify the REST API is responsive
  // (a real WS check requires a client-side connection)
  const allOk = db.ok && storage.ok && auth.ok

  const body = {
    status:      allOk ? 'ok' : 'degraded',
    version:     process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    uptime:      Math.floor((Date.now() - START_TIME) / 1000),
    timestamp:   new Date().toISOString(),
    services: {
      database: db,
      storage:  storage,
      auth:     auth,
      realtime: {
        ok:   true,
        note: 'WebSocket — not health-checked from server side',
      },
    },
  }

  return Response.json(body, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache',
      'Content-Type':  'application/json',
    },
  })
}

async function checkDatabase() {
  const admin = createAdminClient()
  const start = Date.now()
  const { error } = await admin
    .from('institutions')
    .select('id')
    .limit(1)
  const latencyMs = Date.now() - start

  if (error) return { ok: false, error: error.message, latencyMs }
  return { ok: true, latencyMs }
}

async function checkStorage() {
  const admin = createAdminClient()
  const start = Date.now()
  const { error } = await admin.storage.listBuckets()
  const latencyMs = Date.now() - start

  if (error) return { ok: false, error: error.message, latencyMs }
  return { ok: true, latencyMs }
}

async function checkAuth() {
  const admin = createAdminClient()
  const start = Date.now()
  // Lightweight auth check — list 1 user (service role only, safe)
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  const latencyMs = Date.now() - start

  if (error) return { ok: false, error: error.message, latencyMs }
  return { ok: true, latencyMs }
}
