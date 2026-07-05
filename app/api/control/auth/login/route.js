import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { cookies }           from 'next/headers'

// POST /api/control/auth/login
// Body: { email, password }
// Validates Supabase auth → checks company_users → sets cc_uid cookie
export async function POST(req) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    // Authenticate via Supabase
    const supabase = await createClient()
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr || !authData?.user) {
      return Response.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    // Check company_users table (institution users must not get through)
    const admin = createAdminClient()
    const { data: cu } = await admin
      .from('company_users')
      .select('id, name, email, role, is_active')
      .eq('supabase_user_id', authData.user.id)
      .single()

    if (!cu) {
      // Sign out — this Supabase session should not persist for control center
      await supabase.auth.signOut()
      return Response.json({ error: 'No company account found for these credentials.' }, { status: 403 })
    }
    if (!cu.is_active) {
      await supabase.auth.signOut()
      return Response.json({ error: 'Your company account has been deactivated.' }, { status: 403 })
    }

    // Update last_login_at
    await admin
      .from('company_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', cu.id)

    // Set HttpOnly cookie so middleware can gate /control/* routes
    const store = await cookies()
    store.set('cc_uid', cu.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
      secure: process.env.NODE_ENV === 'production',
    })

    return Response.json({ user: { id: cu.id, name: cu.name, email: cu.email, role: cu.role } })
  } catch (err) {
    console.error('[control/auth/login]', err)
    return Response.json({ error: err.message || 'Login failed.' }, { status: 500 })
  }
}
