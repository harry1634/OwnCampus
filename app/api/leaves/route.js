import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/leaves?status=pending|approved|rejected&my=true
// POST /api/leaves   { leave_type, from_date, to_date, reason }
// PATCH /api/leaves  { id, status, approved_by } (admin only)
// DELETE /api/leaves?id=... (own pending leave only)

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status') || null
    const myOnly       = searchParams.get('my') === 'true'
    const page         = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const pageSize     = Math.min(200, parseInt(searchParams.get('limit') || '100'))

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    const isAdmin = ['owner','super_admin','principal','vice_principal','academic_coordinator','hod','hr'].includes(profile?.role || '')

    let query = admin
      .from('leaves')
      .select(`
        id, leave_type, start_date, end_date, days_count, reason, status, created_at,
        approved_at,
        user_id,
        user_profiles ( id, first_name, last_name, role ),
        approved_by_profile:approved_by ( first_name, last_name )
      `)
      .order('created_at', { ascending: false })

    if (institutionId) query = query.eq('institution_id', institutionId)
    if (myOnly || !isAdmin) query = query.eq('user_id', user.id)
    if (statusFilter) query = query.eq('status', statusFilter)
    query = query.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json(data || [])
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { leave_type = 'casual', from_date, to_date, start_date, end_date, reason } = body

    const resolvedStart = start_date || from_date
    const resolvedEnd   = end_date   || to_date

    if (!resolvedStart || !resolvedEnd) {
      return Response.json({ error: 'start_date and end_date are required.' }, { status: 400 })
    }

    const msPerDay  = 1000 * 60 * 60 * 24
    const daysCount = Math.max(1, Math.round(
      (new Date(resolvedEnd) - new Date(resolvedStart)) / msPerDay
    ) + 1)

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()

    const { data, error } = await admin.from('leaves').insert({
      institution_id: profile?.institution_id || null,
      user_id:    user.id,
      leave_type,
      start_date: resolvedStart,
      end_date:   resolvedEnd,
      days_count: daysCount,
      reason:     reason || null,
      status:     'pending',
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, leave: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, status } = body

    if (!id || !status) return Response.json({ error: 'id and status are required.' }, { status: 400 })

    const admin = createAdminClient()

    // Verify the leave belongs to this admin's institution before approving/rejecting
    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const adminRoles = ['owner','super_admin','principal','vice_principal','academic_coordinator','hod','hr']
    if (!adminRoles.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const { data: leaveRecord } = await admin
      .from('leaves').select('institution_id').eq('id', id).single()
    if (!leaveRecord) return Response.json({ error: 'Leave not found' }, { status: 404 })
    if (callerProfile?.institution_id && leaveRecord.institution_id &&
        leaveRecord.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const patch = { status }
    if (status === 'approved' || status === 'rejected') {
      patch.approved_by = user.id
      patch.approved_at = new Date().toISOString()
    }

    const { data, error } = await admin.from('leaves').update(patch).eq('id', id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Push notification to the leave applicant
    if ((status === 'approved' || status === 'rejected') && data?.user_id) {
      try {
        const { data: approverProfile } = await admin
          .from('user_profiles').select('first_name, last_name, institution_id').eq('id', user.id).single()
        const approverName = [approverProfile?.first_name, approverProfile?.last_name].filter(Boolean).join(' ') || 'Admin'
        const institutionId = approverProfile?.institution_id || null
        const emoji = status === 'approved' ? '✅' : '❌'
        await admin.from('notifications').insert({
          institution_id: institutionId,
          user_id:        data.user_id,
          type:           'leave',
          title:          `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          body:           `${emoji} Your leave request has been ${status} by ${approverName}.`,
          is_broadcast:   false,
          is_read:        false,
          metadata:       { leave_id: id, status, days: data.days_count },
        })
      } catch {}
    }

    return Response.json({ success: true, leave: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const admin = createAdminClient()

    // Only allow deletion of own pending leaves
    const { error } = await admin.from('leaves')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
