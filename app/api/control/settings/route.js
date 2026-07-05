import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// GET /api/control/settings
export async function GET() {
  try {
    await requireControlUser()
    const admin = createAdminClient()
    const { data, error } = await admin.from('company_settings').select('key, value')
    if (error) throw new Error(error.message)

    // Convert array to { key: value } map and unwrap JSONB strings
    const settings = Object.fromEntries(
      (data || []).map(row => [row.key, row.value])
    )
    return Response.json({ settings })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

// PATCH /api/control/settings
// Body: { key: value, ... } — any keys in company_settings
export async function PATCH(req) {
  try {
    const cu   = await requireControlUser()
    const body = await req.json()
    const admin = createAdminClient()

    const upserts = Object.entries(body).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? JSON.stringify(value) : value,
      updated_at: new Date().toISOString(),
      updated_by: cu.id,
    }))

    const { error } = await admin
      .from('company_settings')
      .upsert(upserts, { onConflict: 'key' })

    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'settings.updated', 'setting', null, null, { keys: Object.keys(body) })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
