import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// CC-side module request management
// GET   /api/control/institutions/[id]/module-requests  — list requests for this institution
// PATCH /api/control/institutions/[id]/module-requests  — { request_id, action: 'approve'|'reject', rejection_reason? }

export async function GET(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params

    const admin = createAdminClient()
    const { data, error } = await admin.from('module_requests')
      .select('id, module_key, status, note, rejection_reason, requested_by, requested_at, reviewed_at')
      .eq('institution_id', id)
      .order('requested_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ requests: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const { request_id, action, rejection_reason } = await req.json()

    if (!request_id) return Response.json({ error: 'request_id is required.' }, { status: 400 })
    if (!['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'action must be approve or reject.' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: modReq, error: fetchErr } = await admin.from('module_requests')
      .select('id, institution_id, module_key, status')
      .eq('id', request_id)
      .eq('institution_id', id)
      .single()

    if (fetchErr || !modReq) return Response.json({ error: 'Request not found.' }, { status: 404 })
    if (modReq.status !== 'pending') {
      return Response.json({ error: `Request is already ${modReq.status}.` }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Update the request record
    await admin.from('module_requests').update({
      status:           action === 'approve' ? 'approved' : 'rejected',
      reviewed_by:      cu.id,
      reviewed_at:      now,
      rejection_reason: action === 'reject' ? (rejection_reason || null) : null,
    }).eq('id', request_id)

    // If approved: enable the module in institution_modules
    if (action === 'approve') {
      await admin.from('institution_modules').upsert({
        institution_id: id,
        module_key:     modReq.module_key,
        is_enabled:     true,
        enabled_at:     now,
        disabled_at:    null,
        updated_by:     cu.id,
      }, { onConflict: 'institution_id,module_key' })
    }

    const { data: inst } = await admin.from('institutions').select('name').eq('id', id).single()
    await writeAuditLog(
      cu,
      action === 'approve' ? 'module_request.approved' : 'module_request.rejected',
      'institution',
      id,
      inst?.name || id,
      { module_key: modReq.module_key, request_id }
    )

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
