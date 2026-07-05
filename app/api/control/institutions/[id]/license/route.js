import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// PUT /api/control/institutions/[id]/license
// Upserts the institution's license configuration.
export async function PUT(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const body = await req.json()
    const admin = createAdminClient()

    const { data: inst } = await admin
      .from('institutions')
      .select('id, name')
      .eq('id', id)
      .single()
    if (!inst) return Response.json({ error: 'Institution not found.' }, { status: 404 })

    const allowed = [
      'billing_cycle','monthly_fee','currency',
      'valid_from','valid_until','grace_period_days',
      'max_students','max_faculty','max_branches','max_storage_gb',
      'max_admins','max_departments','max_courses','max_classes',
      'max_library_books','max_hostel_rooms','max_vehicles',
      'max_api_requests','max_realtime_connections',
      'discount_percent','discount_reason','notes',
    ]
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    payload.institution_id = id
    payload.updated_by     = cu.id
    payload.updated_at     = new Date().toISOString()

    const { error } = await admin
      .from('institution_licenses')
      .upsert(payload, { onConflict: 'institution_id' })

    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'license.updated', 'institution', id, inst.name, { payload })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
