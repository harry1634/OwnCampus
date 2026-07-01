import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code   = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/auth/login'
  // Only allow relative paths — block open redirects like //evil.com or /@attacker
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/auth/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_error`)
}
