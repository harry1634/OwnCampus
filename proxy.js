import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Exact paths that unauthenticated users can access without being redirected to login
const PUBLIC_ROUTES = new Set([
  '/auth/login', '/auth/signup', '/auth/forgot-password',
  '/auth/reset-password', '/auth/activate', '/',
])
const CONTROL_PUBLIC = new Set(['/control/login'])

export async function proxy(request) {
  const { pathname } = request.nextUrl

  // ── Control Center routes ──────────────────────────────────────
  // Completely isolated from institution auth. Only cc_uid cookie matters here.
  if (pathname.startsWith('/control')) {
    const ccUid = request.cookies.get('cc_uid')?.value

    if (CONTROL_PUBLIC.has(pathname)) {
      // Already authenticated as a company user → go to dashboard
      if (ccUid) {
        return NextResponse.redirect(new URL('/control/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // All other /control/* require cc_uid
    if (!ccUid) {
      return NextResponse.redirect(new URL('/control/login', request.url))
    }

    // Authenticated — pass through (layout will re-validate against DB)
    return NextResponse.next()
  }

  // ── Institution routes ────────────────────────────────────────
  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase env vars are not configured, pass through
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch {
    // stale or invalid refresh token — treat as unauthenticated
  }

  // Exact-match for public paths (using a Set so '/' doesn't match every route via startsWith)
  const isPublicRoute = PUBLIC_ROUTES.has(pathname)

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|icons|manifest.json|sw.js).*)'],
}
