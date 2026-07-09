# OwnCampus — Infrastructure Sprint Documentation

**Sprint completed:** July 2026  
**Scope:** Enterprise Infrastructure Sprint — rate limiting, background jobs, monitoring, logging, connection pooling, async import, health endpoint

---

## 1. Distributed Rate Limiting (Upstash Redis)

### Why
The previous `lib/rateLimit.js` stored hit-timestamps in a module-level `Map`. Each Vercel serverless worker has isolated memory — a client blocked on worker A can freely call worker B. At auto-scale with 10 workers, the effective limit was 10× the configured value.

### What changed
`lib/rateLimit.js` — full replacement with Upstash Redis sliding-window algorithm.

- Same public API: `rateLimitResponse(req, limit, windowMs)` — now `async`
- All callers updated to `await rateLimitResponse(...)`
- Graceful in-process fallback when Redis is not configured (local development)
- Fails **open** on Redis error (legitimate traffic is never blocked by an infra failure)
- Upstash is HTTP-based — no persistent TCP connection, works across all Vercel instances

### Files modified
| File | Change |
|---|---|
| `lib/rateLimit.js` | Full rewrite — Upstash Redis with in-process fallback |
| `app/api/auth/login/route.js` | Added `await` to rate limit call |
| `app/api/control/auth/login/route.js` | Added `await` to rate limit call |
| `app/api/students/import/route.js` | Added `await` to rate limit call |

### Environment variables required
```
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Get these from: [console.upstash.com](https://console.upstash.com) → Create Database → REST API.

### Impact
- Rate limits now enforced globally across all Vercel instances
- No behaviour change for callers — same response format (429 + Retry-After)
- Without env vars: falls back to in-process Map (same as before, fine for dev)

---

## 2. Background Jobs (Inngest)

### Why
Two operations blocked HTTP requests for too long and risked Vercel's 30-second function timeout:

1. **Institution provisioning** (`/api/control/institutions/[id]/provision`) — 7 sequential steps: auth user, 4 DB upserts, email send. Took 8–15 seconds.
2. **Bulk student import** (`/api/students/import`) — sequential per-row loop: 3–4 DB calls per student. At 100+ students, exceeded the 30s timeout and left orphaned auth users on partial failure.

### What changed

**New files:**
| File | Purpose |
|---|---|
| `lib/inngest/client.js` | Inngest singleton client |
| `lib/inngest/provision.js` | Institution provisioning Inngest function |
| `lib/inngest/importStudents.js` | Bulk student import Inngest function |
| `app/api/inngest/route.js` | Inngest serve endpoint (GET/POST/PUT) |

**Modified files:**
| File | Change |
|---|---|
| `app/api/control/institutions/[id]/provision/route.js` | Validates inputs synchronously; fires Inngest event; returns 200 immediately. Falls back to sync if Inngest unavailable. |
| `app/api/students/import/route.js` | ≤ 50 rows: synchronous (existing behaviour). > 50 rows: creates import_jobs row, fires Inngest event, returns job ID. |

**New database table:**
`supabase/migrations/023_import_jobs.sql` — `import_jobs` table tracks status, progress, and row data.

### Provision flow (before → after)
```
Before:  POST /provision → provisionInstitution() [10-15s] → 200 OK
After:   POST /provision → validate (fast) → inngest.send() → 200 OK
                                           ↓ (async, Inngest)
                                    provisionInstitution() runs with retries
```

The Control Center UI still sees `200 OK` and shows its success toast — no UI changes required.

### Import flow (before → after)
```
≤ 50 students (new student form, small imports):
  POST /import → process synchronously → { success, created, skipped, errors }  [unchanged]

> 50 students (bulk CSV):
  POST /import → create import_jobs row → inngest.send() → { jobId, status: 'queued', total }
  GET  /api/students/import/status/[jobId] → { status, processed, created, skipped, errors, progressPct }
```

### Inngest job features
- **Retries**: Provisioning retries 3×; import retries 1×
- **Checkpoints**: Each batch is a `step.run()` — Inngest resumes from the last successful batch if interrupted
- **Progress tracking**: Import function writes progress to `import_jobs` after each 20-row batch
- **Timeout**: Import capped at 10 minutes (handles 1,000+ students)

### Sync fallback
Both routes fall back to synchronous execution if Inngest is not reachable. This means the app works during local development without running `inngest-cli dev`.

### Environment variables required
```
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

Get these from: [app.inngest.com](https://app.inngest.com) → Your App → Manage → Signing Key.

### Local development
```bash
# Terminal 1: run Next.js
npm run dev

# Terminal 2: run Inngest Dev Server (connects to your local app)
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The Inngest Dev Server UI is available at http://localhost:8288.

### Migration required
```bash
supabase db push   # applies migration 023_import_jobs.sql
```

### Deployment steps
1. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel environment variables
2. Deploy to Vercel
3. In Inngest dashboard → Apps → Add App URL: `https://your-domain.com/api/inngest`
4. Inngest will discover and register the functions automatically

---

## 3. Monitoring (Sentry)

### Why
No error tracking, no alerting, no distributed tracing. At 1,000 institutions, a silent bug in provisioning or payments could affect hundreds of institutions before anyone noticed.

### What changed
**New files:**
| File | Purpose |
|---|---|
| `sentry.client.config.js` | Browser Sentry init (10% transaction sampling, 1% session replay) |
| `sentry.server.config.js` | Node.js server Sentry init |
| `sentry.edge.config.js` | Edge runtime Sentry init (middleware) |
| `instrumentation.js` | Next.js 15 instrumentation hook — loads the right config per runtime |

**Modified files:**
| File | Change |
|---|---|
| `next.config.mjs` | Wrapped with `withSentryConfig()` for source map upload and webpack integration |

### What Sentry captures
- Unhandled exceptions in API routes (server-side)
- Unhandled promise rejections
- Client-side JavaScript errors
- Performance traces (10% sample rate in production)
- Session replays on error (100% of error sessions)

### PII masking
Session replays mask all text and block all media by default (`maskAllText: true`, `blockAllMedia: true`).

### Environment variables required
```
# Public (included in browser bundle)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Server-only (optional, falls back to NEXT_PUBLIC_SENTRY_DSN)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# For source map upload (CI only)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

Get the DSN from: Sentry dashboard → Your Project → Settings → Client Keys (DSN).

### CSP update
`next.config.mjs` `connect-src` updated to allow Sentry's ingest endpoints:
```
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://o*.ingest.sentry.io
```

---

## 4. Structured Logging (Pino)

### Why
All logging was via `console.log/error/debug`. Unstructured logs cannot be queried. At 100,000 active users, Vercel's raw log output becomes impossible to search. No request ID correlation meant P1 incidents couldn't be diagnosed.

### What changed
**New file:** `lib/logger.js` — Pino singleton with JSON output, ISO timestamps, Error serializer, and `child()` helper for per-request context.

**Modified files:**
| File | Old | New |
|---|---|---|
| `lib/control/auth.js` | `console.error('[audit] failed...')` | `logger.error({ err, action, targetId }, '...')` |
| `app/api/control/auth/login/route.js` | `console.error('[control/auth/login]', err)` | `logger.error({ err, route }, '...')` |

### Usage pattern
```js
// At top of an API route:
import logger from '@/lib/logger'
const log = logger.child({ route: '/api/students', userId, institutionId })

log.info({ count: rows.length }, 'Students imported')
log.error({ err }, 'Import failed')
```

### Output format (production)
```json
{ "level":"info", "time":"2026-07-09T10:30:00.000Z", "env":"production", "version":"0.1.0",
  "service":"owncampus-api", "route":"/api/students", "userId":"abc-123",
  "institutionId":"def-456", "msg":"Students imported", "count":42 }
```

### Environment variables
```
LOG_LEVEL=info   # default: 'info' in production, 'debug' in development
```

### Shipping logs to Axiom (recommended)
In Vercel: Settings → Log Drains → Add Drain → Axiom (HTTP).  
Axiom free tier: 500 GB/month, 30-day retention.

---

## 5. Database Connection Pooling

### Status: Verified — No code changes required

### Why
`@supabase/supabase-js` communicates via HTTP (PostgREST), not direct PostgreSQL TCP. All requests pass through Supabase's built-in PgBouncer in transaction mode.

### What was verified
- `lib/supabase/admin.js`: Singleton pattern — one client instance reused across all admin requests. The singleton avoids creating multiple HTTP client instances.
- `lib/supabase/server.js`: Creates a new SSR client per request, but each request uses a fresh HTTP call through PgBouncer. No persistent TCP connection is held.
- No `pg` or `postgres` direct connection packages are used anywhere in the codebase.

### What was updated
`lib/supabase/admin.js` — Added `x-client-info` request header for observability in Supabase project logs, and added documentation comment about the connection model.

### Action required (configuration, not code)
Ensure the Supabase project uses the **pooler connection string** for any direct SQL access (migrations, pg_cron):
```
SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

Port **6543** is the PgBouncer transaction-mode pooler. Port 5432 is direct (no pooling).

---

## 6. Student Import (Background Job)

Covered in section 2 above.

### New API endpoint
`GET /api/students/import/status/[jobId]` — poll for job status.

**Response:**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "total": 250,
  "processed": 80,
  "created": 75,
  "skipped": 3,
  "errors": 2,
  "progressPct": 32,
  "createdAt": "2026-07-09T10:00:00Z",
  "startedAt": "2026-07-09T10:00:01Z",
  "completedAt": null,
  "errorDetails": [{ "name": "John Doe", "error": "email already registered" }]
}
```

---

## 7. Health Endpoint

`GET /api/health` — publicly accessible, no auth required.

**Response (all healthy):**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2026-07-09T10:00:00Z",
  "services": {
    "database": { "ok": true, "latencyMs": 12 },
    "storage":  { "ok": true, "latencyMs": 8  },
    "auth":     { "ok": true, "latencyMs": 15 },
    "realtime": { "ok": true, "note": "WebSocket — not health-checked from server side" }
  }
}
```

**HTTP status:** 200 (all ok) or 503 (any service degraded).

### Uptime monitoring setup (BetterStack)
1. BetterStack → Monitors → New Monitor
2. URL: `https://your-domain.com/api/health`
3. Check interval: 1 minute
4. Alert condition: status ≠ 200

---

## Deployment Checklist

### Environment variables to add in Vercel

| Variable | Required | Where to get it |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | **Yes** (production) | Upstash console |
| `UPSTASH_REDIS_REST_TOKEN` | **Yes** (production) | Upstash console |
| `INNGEST_EVENT_KEY` | **Yes** (production) | Inngest dashboard |
| `INNGEST_SIGNING_KEY` | **Yes** (production) | Inngest dashboard |
| `NEXT_PUBLIC_SENTRY_DSN` | **Yes** | Sentry project settings |
| `SENTRY_DSN` | Recommended | Same DSN, server-only copy |
| `SENTRY_ORG` | For source maps | Sentry org slug |
| `SENTRY_PROJECT` | For source maps | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | For source maps in CI | Sentry API token |
| `LOG_LEVEL` | Optional | `info` (default) |

### Migration
```bash
supabase db push   # applies 023_import_jobs.sql
```

### Inngest app registration
1. Deploy to Vercel (or preview URL)
2. Inngest dashboard → Apps → Sync New App
3. App URL: `https://your-domain.com/api/inngest`
4. Inngest will discover `institution-provision` and `students-bulk-import` functions

### Post-deployment verification
- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] Login attempt (wrong password) triggers rate limit after 5 tries
- [ ] Provision an institution → Inngest dashboard shows the run
- [ ] Import > 50 students → response contains `jobId`
- [ ] Poll `GET /api/students/import/status/[jobId]` → shows progress
- [ ] Trigger a 500 error → appears in Sentry within 30 seconds
- [ ] Structured logs appear in Vercel log drain / Axiom

---

## Package changes

**Added:**
- `@upstash/redis` — Upstash Redis HTTP client
- `@upstash/ratelimit` — Upstash sliding-window rate limit primitives
- `inngest` — Inngest background job client and function SDK
- `@sentry/nextjs` — Sentry error tracking and performance monitoring
- `pino` — Fast structured JSON logger

**Not yet removed** (from Performance Sprint recommendations):
These unused packages can be removed by running:
```bash
npm uninstall @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list axios @react-pdf/renderer react-hot-toast react-intersection-observer @tanstack/react-table swr
```
