import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator','hr']

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { supabaseId, password } = await req.json()
    if (!supabaseId || !password) {
      return Response.json({ error: 'supabaseId and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Caller must be an admin
    const { data: callerProfile } = await supabase
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    if (!ADMIN_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Target must belong to same institution
    const { data: targetProfile } = await supabase
      .from('user_profiles').select('institution_id').eq('id', supabaseId).maybeSingle()
    if (!targetProfile) return Response.json({ error: 'User not found' }, { status: 404 })
    if (targetProfile.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'User belongs to a different institution' }, { status: 403 })
    }

    const { error } = await supabase.auth.admin.updateUserById(supabaseId, { password })
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
