import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// DELETE /api/admin/users/[id] — soft-delete (deactivate) a user
export async function DELETE(req, { params }) {
  try {
    // Auth guard — must be logged in
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()
    const { id } = await params

    // Role check — only admin roles can deactivate users
    const ADMIN_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator']
    const { data: callerProfile } = await supabase
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    if (!ADMIN_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Institution scoping — target user must belong to same institution
    const { data: targetProfile } = await supabase
      .from('user_profiles').select('institution_id').eq('id', id).single()
    if (!targetProfile) return Response.json({ error: 'User not found' }, { status: 404 })
    if (targetProfile.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'User belongs to a different institution' }, { status: 403 })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] — update profile fields + optionally students table columns
// Body: { first_name, last_name, phone, metadata, total_fee, paid_amount, fee_status, roll_number, parent_name }
export async function PATCH(req, { params }) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()
    const { id } = await params
    const body = await req.json()

    // Role check — only admin roles can edit user profiles
    const ADMIN_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator', 'hr', 'admission_officer']
    const { data: callerProfile } = await supabase
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    if (!ADMIN_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Institution scoping — target user must belong to same institution
    const { data: targetProfile } = await supabase
      .from('user_profiles').select('institution_id').eq('id', id).single()
    if (!targetProfile) return Response.json({ error: 'User not found' }, { status: 404 })
    if (targetProfile.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'User belongs to a different institution' }, { status: 403 })
    }

    // Update user_profiles
    const profilePatch = {}
    if (body.first_name !== undefined) profilePatch.first_name = body.first_name
    if (body.last_name  !== undefined) profilePatch.last_name  = body.last_name
    if (body.phone      !== undefined) profilePatch.phone      = body.phone
    if (body.metadata   !== undefined) profilePatch.metadata   = body.metadata

    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabase
        .from('user_profiles')
        .update(profilePatch)
        .eq('id', id)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    // Also update students table columns so fee/roll data survives a page refresh
    // (students.total_fee takes priority over user_profiles.metadata.total_fee in GET)
    const studentPatch = {}
    if (body.total_fee   !== undefined) studentPatch.total_fee   = body.total_fee   !== '' ? (Number(body.total_fee)   || 0) : 0
    if (body.paid_amount !== undefined) studentPatch.paid_amount = body.paid_amount !== '' ? (Number(body.paid_amount) || 0) : 0
    if (body.fee_status  !== undefined) studentPatch.fee_status  = body.fee_status  || null
    if (body.roll_number !== undefined) studentPatch.roll_number = body.roll_number || null
    if (body.parent_name !== undefined) studentPatch.parent_name = body.parent_name || null

    if (Object.keys(studentPatch).length > 0) {
      await supabase.from('students').update(studentPatch).eq('user_id', id)
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
