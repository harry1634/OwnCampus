import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','hr','academic_coordinator','administrator','chairman','director']

export async function PATCH(req, { params }) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { branchId } = await req.json()

    const admin = createAdminClient()

    // Verify caller is an admin of this institution
    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    if (!ADMIN_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const newBranchId = branchId || null

    // Verify target user belongs to the same institution as the caller
    const { data: targetProfile } = await admin
      .from('user_profiles').select('institution_id').eq('id', id).single()
    if (!targetProfile) return Response.json({ error: 'User not found.' }, { status: 404 })
    if (callerProfile.institution_id && targetProfile.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'Forbidden: user does not belong to your institution.' }, { status: 403 })
    }

    // If assigning a specific branch, verify it belongs to the same institution
    if (newBranchId) {
      const { data: branch } = await admin
        .from('branches').select('institution_id').eq('id', newBranchId).single()
      if (branch?.institution_id && branch.institution_id !== callerProfile.institution_id) {
        return Response.json({ error: 'Forbidden: branch does not belong to your institution.' }, { status: 403 })
      }
    }

    // 1. Update user_profiles.branch_id
    const { error: upError } = await admin
      .from('user_profiles')
      .update({ branch_id: newBranchId })
      .eq('id', id)
      .eq('institution_id', callerProfile.institution_id)
    if (upError) return Response.json({ error: upError.message }, { status: 500 })

    // 2. Update students.branch_id (where user_id matches — no-op if user is not a student)
    await admin.from('students').update({ branch_id: newBranchId })
      .eq('user_id', id).eq('institution_id', callerProfile.institution_id)

    // 3. Update faculty.branch_id (where user_id matches — no-op if user is not faculty)
    await admin.from('faculty').update({ branch_id: newBranchId })
      .eq('user_id', id).eq('institution_id', callerProfile.institution_id)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
