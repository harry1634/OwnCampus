import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// PUT /api/control/institutions/[id]/modules
// Body: { modules: { [moduleKey]: boolean } }
export async function PUT(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const { modules } = await req.json()
    if (!modules || typeof modules !== 'object') {
      return Response.json({ error: 'modules object is required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: inst } = await admin.from('institutions').select('id, name').eq('id', id).single()
    if (!inst) return Response.json({ error: 'Institution not found.' }, { status: 404 })

    const now = new Date().toISOString()
    const rows = Object.entries(modules).map(([key, enabled]) => ({
      institution_id: id,
      module_key:     key,
      is_enabled:     Boolean(enabled),
      enabled_at:     enabled  ? now : null,
      disabled_at:    !enabled ? now : null,
      updated_by:     cu.id,
    }))

    const { error } = await admin
      .from('institution_modules')
      .upsert(rows, { onConflict: 'institution_id,module_key' })

    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'modules.updated', 'institution', id, inst.name, { modules })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
