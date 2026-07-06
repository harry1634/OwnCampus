import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isModuleEnabled }   from '@/lib/licenseEngine'

const ADMIN_ROLES = new Set([
  'owner','super_admin','principal','vice_principal','academic_coordinator',
  'chairman','director','administrator','teacher','faculty','trainer','hod',
  'staff','coordinator','instructor','professor','dean',
])

async function getProfileAndInstitution() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles')
    .select('id, institution_id, role').eq('id', user.id).single()
  if (!profile?.institution_id) return { error: 'No institution', status: 400 }
  return { user, profile, institutionId: profile.institution_id, admin }
}

// GET /api/lms — list all courses for the institution
export async function GET() {
  try {
    const ctx = await getProfileAndInstitution()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { data, error } = await admin.from('lms_courses')
      .select('id, title, subject, description, status, modules, created_by, created_at, updated_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ courses: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/lms — create a new course
export async function POST(req) {
  try {
    const ctx = await getProfileAndInstitution()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, profile, institutionId, admin } = ctx

    if (!ADMIN_ROLES.has(profile.role)) {
      return Response.json({ error: 'Only admin/faculty can create courses.' }, { status: 403 })
    }

    if (!(await isModuleEnabled(institutionId, 'lms'))) {
      return Response.json({ error: 'LMS module is not enabled for your institution.' }, { status: 403 })
    }

    const { title, subject, description, status, modules, metadata } = await req.json()
    if (!title?.trim()) return Response.json({ error: 'Course title is required.' }, { status: 400 })

    const { data, error } = await admin.from('lms_courses').insert({
      institution_id: institutionId,
      title:          title.trim(),
      subject:        subject || null,
      description:    description || null,
      status:         ['draft','published'].includes(status) ? status : 'draft',
      modules:        Array.isArray(modules) ? modules : [],
      metadata:       (metadata && typeof metadata === 'object') ? metadata : {},
      created_by:     user.id,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ course: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/lms — update a course (title, status, modules, etc.)
export async function PATCH(req) {
  try {
    const ctx = await getProfileAndInstitution()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { id, ...updates } = await req.json()
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const allowed = ['title','subject','description','status','modules','metadata']
    const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    patch.updated_at = new Date().toISOString()

    const { error } = await admin.from('lms_courses')
      .update(patch)
      .eq('id', id)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/lms — soft delete (set status to archived)
export async function DELETE(req) {
  try {
    const ctx = await getProfileAndInstitution()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const { error } = await admin.from('lms_courses')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
