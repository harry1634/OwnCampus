import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'
import { getInstitutionUsage }               from '@/lib/licenseEngine'

// GET /api/control/institutions/[id]
export async function GET(req, { params }) {
  try {
    await requireControlUser()
    const { id } = await params
    const admin = createAdminClient()

    const [
      { data: inst, error: instErr },
      { data: license },
      { data: modules },
      { data: payments },
      { data: tickets },
      { data: statusHistory },
      { data: moduleRequests },
    ] = await Promise.all([
      admin.from('institutions').select('id,name,slug,type,logo_url,email,phone,website,address,city,state,country,established_year,is_active,control_status,provisioned_at,temp_admin_email,code,created_at,updated_at').eq('id', id).single(),
      admin.from('institution_licenses').select('institution_id,valid_from,valid_until,billing_cycle,monthly_fee,currency,grace_period_days,max_students,max_faculty,max_admins,max_branches,max_departments,max_courses,max_classes,max_library_books,max_hostel_rooms,max_vehicles,max_transport_routes,max_api_requests,max_realtime_connections,max_storage_gb,discount_percent').eq('institution_id', id).single(),
      admin.from('institution_modules').select('institution_id,module_key,is_enabled,enabled_at,disabled_at').eq('institution_id', id),
      admin.from('institution_payments').select('id,billing_month,amount,status,paid_at,invoice_url,notes').eq('institution_id', id).order('billing_month', { ascending: false }).limit(24),
      admin.from('support_tickets').select('id,ticket_number,subject,status,priority,created_at').eq('institution_id', id).order('created_at', { ascending: false }).limit(10),
      admin.from('institution_status_history').select('id,status,changed_by,changed_at,reason').eq('institution_id', id).order('changed_at', { ascending: false }).limit(20),
      admin.from('module_requests').select('id,module_key,status,note,rejection_reason,requested_at,reviewed_at').eq('institution_id', id).order('requested_at', { ascending: false }),
    ])

    if (instErr || !inst) {
      return Response.json({ error: 'Institution not found.' }, { status: 404 })
    }

    // Full usage across all tracked resources
    const usage = await getInstitutionUsage(id)

    return Response.json({
      institution: inst,
      license: license || null,
      modules: modules || [],
      payments: payments || [],
      tickets: tickets || [],
      statusHistory: statusHistory || [],
      moduleRequests: moduleRequests || [],
      usage,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

// PATCH /api/control/institutions/[id]
// Updates basic institution info
export async function PATCH(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const body = await req.json()
    const admin = createAdminClient()

    const allowed = ['name', 'email', 'type', 'is_active']
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    const { error } = await admin.from('institutions').update(updates).eq('id', id)
    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'institution.updated', 'institution', id, body.name || id, { updates })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
