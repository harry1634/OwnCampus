import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator']

export async function DELETE(req, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const adminSupabase = createAdminClient()

    const { data: callerProfile } = await adminSupabase
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    if (!ALLOWED_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: ann } = await adminSupabase
      .from('announcements').select('institution_id').eq('id', id).single()
    if (!ann) return Response.json({ error: 'Announcement not found' }, { status: 404 })
    if (callerProfile?.institution_id && ann.institution_id && ann.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await adminSupabase.from('announcements').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
