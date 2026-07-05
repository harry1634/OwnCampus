import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_ROLES = ['admin','administrator','super_admin','chairman','director','owner','principal','vice_principal','academic_coordinator']
const FACULTY_ROLES = ['teacher','faculty','trainer','hod','staff','librarian','counsellor','driver','helper']

function resolvePortalRole(role) {
  const normalized = String(role || '').toLowerCase().trim()
  if (ADMIN_ROLES.includes(normalized)) return 'admin'
  if (FACULTY_ROLES.includes(normalized)) return 'faculty'
  if (normalized === 'student') return 'student'
  return null
}

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr || !authData?.user) {
      return NextResponse.json({ error: authErr?.message || 'Invalid credentials.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role,first_name,last_name,metadata,institution_id,branch_id,is_active')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profile?.is_active === false) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Your account has been deactivated. Contact your institution admin.' }, { status: 403 })
    }

    const metaRole = authData.user.user_metadata?.role
    const effectiveRole = (profile?.role && profile.role !== 'guest') ? profile.role : metaRole
    const portalRole = resolvePortalRole(effectiveRole || '')

    if (!portalRole) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Account role not configured. Contact admin.' }, { status: 403 })
    }

    return NextResponse.json({
      user: authData.user,
      profile,
      portalRole,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Login failed.' }, { status: 500 })
  }
}
