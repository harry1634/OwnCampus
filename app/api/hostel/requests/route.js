import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const ADMIN_ROLES = ['owner', 'super_admin', 'principal', 'hostel_manager']

async function getCallerProfile(admin, userId) {
  const { data } = await admin
    .from('user_profiles')
    .select('institution_id, role')
    .eq('id', userId)
    .single()
  return data || {}
}

// GET /api/hostel/requests
// ?my=true  → returns only the caller's requests
// ?status=  → filter by status
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const my      = searchParams.get('my') === 'true'
    const status  = searchParams.get('status')

    const admin = createAdminClient()
    const profile = await getCallerProfile(admin, user.id)

    let q = admin
      .from('hostel_requests')
      .select(`
        id, preferred_type, message, status, notes, created_at, updated_at,
        students (
          id, roll_number,
          user_profiles ( first_name, last_name, email )
        )
      `)
      .order('created_at', { ascending: false })

    if (my) {
      q = q.eq('user_id', user.id)
    } else {
      if (profile.institution_id) q = q.eq('institution_id', profile.institution_id)
    }

    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const requests = (data || []).map(r => {
      const up = r.students?.user_profiles || {}
      return {
        id:            r.id,
        preferredType: r.preferred_type,
        message:       r.message,
        status:        r.status,
        notes:         r.notes,
        createdAt:     r.created_at,
        updatedAt:     r.updated_at,
        rollNumber:    r.students?.roll_number || '',
        studentName:   [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || 'Unknown',
        email:         up.email || '',
      }
    })

    return Response.json({ requests })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/hostel/requests — student submits a hostel request
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { preferred_type, message } = body

    const admin = createAdminClient()
    const profile = await getCallerProfile(admin, user.id)
    const institutionId = profile.institution_id
    if (!institutionId) return Response.json({ error: 'Institution not found' }, { status: 400 })

    // Look up student record
    const { data: studentRow } = await admin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!studentRow) return Response.json({ error: 'Student record not found' }, { status: 400 })

    // Check for existing active request
    const { data: existing } = await admin
      .from('hostel_requests')
      .select('id, status')
      .eq('student_id', studentRow.id)
      .in('status', ['pending', 'waitlisted'])
      .limit(1)

    if (existing && existing.length > 0) {
      return Response.json({ error: 'You already have an active hostel request under review.' }, { status: 409 })
    }

    const { data, error } = await admin
      .from('hostel_requests')
      .insert({
        institution_id: institutionId,
        student_id:     studentRow.id,
        user_id:        user.id,
        preferred_type: preferred_type || null,
        message:        message        || null,
        status:         'pending',
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Notify admins
    try {
      const { data: admins } = await admin
        .from('user_profiles')
        .select('id')
        .in('role', ADMIN_ROLES)
        .eq('institution_id', institutionId)

      if (admins && admins.length > 0) {
        const { data: callerProfile } = await admin
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()
        const callerName = callerProfile
          ? [callerProfile.first_name, callerProfile.last_name].filter(Boolean).join(' ')
          : 'A student'

        await admin.from('notifications').insert(
          admins.map(a => ({
            institution_id: institutionId,
            user_id:        a.id,
            type:           'general',
            title:          'New Hostel Request',
            body:           `${callerName} has submitted a hostel accommodation request.`,
            is_broadcast:   false,
            is_read:        false,
            link:           '/hostel',
          }))
        )
      }
    } catch (_) {}

    return Response.json({ success: true, request: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/hostel/requests — admin approves or rejects a request
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const profile = await getCallerProfile(admin, user.id)

    if (!ADMIN_ROLES.includes(profile.role)) {
      return Response.json({ error: 'Forbidden: admin role required' }, { status: 403 })
    }

    const body = await req.json()
    const { id, status, notes } = body
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
    if (!['approved', 'rejected', 'waitlisted'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify request belongs to caller's institution
    const { data: existing } = await admin
      .from('hostel_requests')
      .select('id, institution_id, user_id')
      .eq('id', id)
      .single()

    if (!existing) return Response.json({ error: 'Request not found' }, { status: 404 })
    if (profile.institution_id && existing.institution_id !== profile.institution_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('hostel_requests')
      .update({
        status,
        notes:       notes        || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Notify student
    try {
      if (existing.user_id) {
        const msg = status === 'approved'
          ? 'Your hostel accommodation request has been approved!'
          : status === 'waitlisted'
          ? 'Your hostel request has been placed on the waitlist.'
          : 'Your hostel accommodation request has been reviewed.'

        await admin.from('notifications').insert({
          institution_id: existing.institution_id,
          user_id:        existing.user_id,
          type:           'general',
          title:          status === 'approved' ? 'Hostel Request Approved' : status === 'waitlisted' ? 'Hostel Request Waitlisted' : 'Hostel Request Update',
          body:           msg,
          is_broadcast:   false,
          is_read:        false,
          link:           '/student/transport#hostel',
        })
      }
    } catch (_) {}

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
