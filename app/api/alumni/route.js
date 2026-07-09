import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_ROLES = new Set([
  'owner','super_admin','principal','vice_principal','academic_coordinator',
  'chairman','director','administrator',
])

const AVATAR_COLORS = ['#2563EB','#7C3AED','#059669','#DC2626','#D97706','#0891B2']

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

// GET /api/alumni
export async function GET(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const pageSize = Math.min(100, parseInt(searchParams.get('limit') || '50'))

    let query = admin.from('alumni')
      .select('id, name, batch, program, company, role, location, email, phone, linkedin_url, is_mentor, avatar_url, created_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ alumni: data || [], page, pageSize })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/alumni — add an alumnus record
export async function POST(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, profile, institutionId, admin } = ctx

    if (!ADMIN_ROLES.has(profile.role)) {
      return Response.json({ error: 'Only admins can add alumni.' }, { status: 403 })
    }

    const body = await req.json()
    const { name, batch, program, company, role, location, email, phone, linkedin_url, is_mentor } = body

    if (!name?.trim()) return Response.json({ error: 'Name is required.' }, { status: 400 })

    const { count } = await admin.from('alumni')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)

    const { data, error } = await admin.from('alumni').insert({
      institution_id: institutionId,
      name:           name.trim(),
      batch:          batch || null,
      program:        program || null,
      company:        company?.trim() || null,
      role:           role?.trim() || null,
      location:       location?.trim() || null,
      email:          email?.trim() || null,
      phone:          phone?.trim() || null,
      linkedin_url:   linkedin_url?.trim() || null,
      is_mentor:      !!is_mentor,
      avatar_color:   AVATAR_COLORS[(count || 0) % AVATAR_COLORS.length],
      added_by:       user.id,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ alumnus: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/alumni — toggle mentor status or update fields
export async function PATCH(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { id, ...updates } = await req.json()
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const allowed = ['name','batch','program','company','role','location','email','phone','linkedin_url','is_mentor']
    const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    patch.updated_at = new Date().toISOString()

    const { error } = await admin.from('alumni')
      .update(patch)
      .eq('id', id)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
