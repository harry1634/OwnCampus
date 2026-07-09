/**
 * lib/rateLimit.js
 * Sliding-window rate limiter backed by Upstash Redis.
 * Falls back to an in-process Map when Redis env vars are not set
 * (local development without Redis configured).
 *
 * Upstash Redis is HTTP-based — no persistent TCP connection, works
 * across every Vercel serverless worker instance.
 *
 * Required env vars (production):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

// ── In-process fallback (dev / Redis not configured) ─────────────────────────
const _store = new Map()

function _checkInProcess(ip, limit, windowMs) {
  const now    = Date.now()
  const cutoff = now - windowMs
  const hits   = (_store.get(ip) || []).filter(t => t > cutoff)

  if (hits.length >= limit) return { ok: false, resetAt: hits[0] + windowMs }

  hits.push(now)
  _store.set(ip, hits)

  if (_store.size > 5_000) {
    for (const [key, timestamps] of _store) {
      const recent = timestamps.filter(t => t > cutoff)
      if (recent.length === 0) _store.delete(key)
      else _store.set(key, recent)
    }
  }

  return { ok: true, resetAt: null }
}

// ── Upstash Redis sliding-window ──────────────────────────────────────────────
let _limiter = null  // lazy singleton

async function _getRedisLimiter() {
  if (_limiter) return _limiter

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null   // no Redis configured — caller uses fallback

  const { Redis }        = await import('@upstash/redis')
  const { Ratelimit }    = await import('@upstash/ratelimit')

  const redis = new Redis({ url, token })

  // One shared Ratelimit instance handles multiple windows via per-key prefix.
  // checkRateLimit creates a fresh Ratelimit per (limit, windowMs) call, but
  // we cache by those parameters to avoid creating many instances.
  _limiter = { redis, Ratelimit }
  return _limiter
}

// Cache Ratelimit instances keyed by "limit:windowMs"
const _limiters = new Map()

async function checkRateLimit(ip, limit, windowMs) {
  const redis = await _getRedisLimiter()

  if (!redis) {
    // Fallback: in-process (breaks across multiple instances, fine for dev)
    return _checkInProcess(ip, limit, windowMs)
  }

  const cacheKey = `${limit}:${windowMs}`
  if (!_limiters.has(cacheKey)) {
    const windowSeconds = Math.ceil(windowMs / 1000)
    const rl = new redis.Ratelimit({
      redis:      redis.redis,
      limiter:    redis.Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix:     'rl',
      analytics:  false,
    })
    _limiters.set(cacheKey, rl)
  }

  const limiter = _limiters.get(cacheKey)
  const { success, reset } = await limiter.limit(ip)

  return {
    ok:      success,
    resetAt: success ? null : reset,
  }
}

// ── Public API (unchanged from previous in-process version) ──────────────────

/**
 * Returns a 429 Response if the caller is over the limit, or null if allowed.
 * Extracts the IP from standard proxy headers.
 *
 * @param {Request} req
 * @param {number}  limit    — default 10
 * @param {number}  windowMs — default 60 000 ms (1 minute)
 */
export async function rateLimitResponse(req, limit = 10, windowMs = 60_000) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || '127.0.0.1'

  let result
  try {
    result = await checkRateLimit(ip, limit, windowMs)
  } catch {
    // Redis error — fail open so legitimate traffic is not blocked
    return null
  }

  if (result.ok) return null

  const retryAfterSec = result.resetAt
    ? Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
    : Math.ceil(windowMs / 1000)

  return Response.json(
    { error: 'Too many requests. Please wait before trying again.' },
    {
      status: 429,
      headers: {
        'Retry-After':           String(retryAfterSec),
        'X-RateLimit-Limit':     String(limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':     String(result.resetAt ?? Date.now() + windowMs),
      },
    }
  )
}
