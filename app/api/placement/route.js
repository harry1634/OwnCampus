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
    .select('id, institution_id, role').eq('id', user.id).single()
  if (!profile?.institution_id) return { error: 'No institution', status: 400 }
  return { user, profile, institutionId: profile.institution_id, admin }
}

// GET /api/placement
export async function GET(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    let query = admin.from('placement_drives')
      .select('*')
      .eq('institution_id', institutionId)
      .order('drive_date', { ascending: false })

    if (q) query = query.ilike('company_name', `%${q}%`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ drives: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/placement
export async function POST(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, profile, institutionId, admin } = ctx

    if (!ADMIN_ROLES.has(profile.role)) {
      return Response.json({ error: 'Only admins can add placement drives.' }, { status: 403 })
    }

    const { company_name, industry, role, ctc, drive_date, slots, status } = await req.json()
    if (!company_name?.trim()) return Response.json({ error: 'Company name is required.' }, { status: 400 })

    const { data, error } = await admin.from('placement_drives').insert({
      institution_id: institutionId,
      company_name:   company_name.trim(),
      industry:       industry || null,
      role:           role?.trim() || null,
      ctc:            ctc?.trim() || null,
      drive_date:     drive_date || null,
      slots:          parseInt(slots) || 0,
      applied:        0,
      shortlisted:    0,
      status:         ['upcoming','ongoing','completed','cancelled'].includes(status) ? status : 'upcoming',
      added_by:       user.id,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ drive: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/placement
export async function PATCH(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { id, ...updates } = await req.json()
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const allowed = ['company_name','industry','role','ctc','drive_date','slots','applied','shortlisted','status']
    const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    patch.updated_at = new Date().toISOString()

    const { error } = await admin.from('placement_drives')
      .update(patch).eq('id', id).eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
