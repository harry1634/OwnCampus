import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_ROLES = new Set([
  'owner','super_admin','principal','vice_principal','academic_coordinator',
  'chairman','director','administrator',
])

async function getProfile() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles')
    .select('id, institution_id, role, first_name, last_name').eq('id', user.id).single()
  if (!profile?.institution_id) return { error: 'No institution', status: 400 }
  return { user, profile, institutionId: profile.institution_id, admin }
}

// GET /api/procurement/requests
// Admins see all; faculty see only their own
export async function GET() {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, profile, institutionId, admin } = ctx

    let q = admin.from('equipment_requests')
      .select('*')
      .eq('institution_id', institutionId)
      .is('cancelled_at', null)
      .order('created_at', { ascending: false })

    if (!ADMIN_ROLES.has(profile.role)) {
      q = q.eq('faculty_id', user.id)
    }

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ requests: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/procurement/requests — faculty submits a request
export async function POST(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, profile, institutionId, admin } = ctx

    const { item, reason, qty, urgency } = await req.json()
    if (!item?.trim()) return Response.json({ error: 'Item is required.' }, { status: 400 })

    const facultyName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email

    const { data, error } = await admin.from('equipment_requests').insert({
      institution_id: institutionId,
      faculty_id:     user.id,
      faculty_name:   facultyName,
      item:           item.trim(),
      quantity:       parseInt(qty) || 1,
      urgency:        ['low','medium','high'].includes(urgency) ? urgency : 'medium',
      reason:         reason?.trim() || null,
      status:         'pending',
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ request: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/procurement/requests
// Admins update status; faculty cancel their own (sets cancelled_at)
export async function PATCH(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, profile, institutionId, admin } = ctx

    const { id, status, cancel } = await req.json()
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    if (cancel) {
      // Faculty cancelling their own request
      const { error } = await admin.from('equipment_requests')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('id', id)
        .eq('institution_id', institutionId)
        .eq('faculty_id', user.id)
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ ok: true })
    }

    if (!ADMIN_ROLES.has(profile.role)) {
      return Response.json({ error: 'Only admins can update request status.' }, { status: 403 })
    }

    const valid = ['pending','approved','rejected']
    if (!valid.includes(status)) return Response.json({ error: 'Invalid status.' }, { status: 400 })

    const { error } = await admin.from('equipment_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
