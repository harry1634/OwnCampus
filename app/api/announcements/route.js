import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Use admin client to bypass RLS on announcements table
    const adminSupabase = createAdminClient()

    const { data: profile } = await adminSupabase
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    let q = adminSupabase
      .from('announcements')
      .select('*')
      .is('deleted_at', null)
      .order('is_pinned', { ascending: false })
      .order('created_at',  { ascending: false })
      .limit(50)
    if (institutionId) q = q.eq('institution_id', institutionId)

    const { data, error } = await q

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Resolve creator names from user_profiles
    const rows = data || []
    const creatorIds = [...new Set(rows.map(a => a.created_by).filter(Boolean))]
    let nameMap = {}
    if (creatorIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', creatorIds)
      ;(profiles || []).forEach(p => {
        nameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Admin'
      })
    }
    const announcements = rows.map(a => ({
      ...a,
      created_by_name: nameMap[a.created_by] || 'Admin',
    }))
    return Response.json({ announcements })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

const ANNOUNCEMENT_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator', 'hr', 'admission_officer', 'librarian', 'hostel_manager', 'transport_manager', 'receptionist']

export async function POST(req) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, content, type = 'general', target_audience = 'all', is_pinned = false } = body

    if (!title?.trim()) return Response.json({ error: 'Title is required.' }, { status: 400 })
    if (!content?.trim()) return Response.json({ error: 'Content is required.' }, { status: 400 })

    const adminSupabase = createAdminClient()

    // Get poster's profile (includes institution_id and role)
    const { data: profile } = await adminSupabase
      .from('user_profiles')
      .select('first_name, last_name, institution_id, role')
      .eq('id', user.id)
      .single()

    // Role check — students and faculty cannot post announcements
    if (!ANNOUNCEMENT_ROLES.includes(profile?.role || '')) {
      return Response.json({ error: 'Only administrators can create announcements.' }, { status: 403 })
    }

    const institutionId = profile?.institution_id
    if (!institutionId) {
      return Response.json({ error: 'Institution not found for your account.' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('announcements')
      .insert({
        title: title.trim(),
        content: content.trim(),
        type,
        target_audience,
        is_pinned,
        created_by: user.id,
        institution_id: institutionId,
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, announcement: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const adminSupabase = createAdminClient()

    // Scope: only allow deletion within the same institution
    const { data: profile } = await adminSupabase
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const allowedRoles = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator']
    if (!allowedRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: ann } = await adminSupabase
      .from('announcements').select('institution_id, created_by').eq('id', id).single()
    if (!ann) return Response.json({ error: 'Announcement not found' }, { status: 404 })
    if (profile?.institution_id && ann.institution_id && ann.institution_id !== profile.institution_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await adminSupabase.from('announcements').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
