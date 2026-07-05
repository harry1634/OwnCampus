import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

const VALID_TRANSITIONS = {
  pending:      ['trial', 'active', 'cancelled'],
  trial:        ['active', 'suspended', 'cancelled', 'grace_period', 'expired'],
  active:       ['suspended', 'cancelled', 'grace_period', 'expired'],
  grace_period: ['active', 'suspended', 'cancelled', 'expired'],
  suspended:    ['active', 'cancelled'],
  expired:      ['active', 'cancelled'],
  cancelled:    ['active'],
}

// POST /api/control/institutions/[id]/status
// Body: { status, reason }
export async function POST(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const { status: newStatus, reason } = await req.json()

    if (!newStatus) return Response.json({ error: 'status is required.' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch current status
    const { data: inst, error: fetchErr } = await admin
      .from('institutions')
      .select('id, name, control_status')
      .eq('id', id)
      .single()

    if (fetchErr || !inst) return Response.json({ error: 'Institution not found.' }, { status: 404 })

    const allowed = VALID_TRANSITIONS[inst.control_status] || []
    if (!allowed.includes(newStatus)) {
      return Response.json({
        error: `Cannot transition from '${inst.control_status}' to '${newStatus}'.`
      }, { status: 400 })
    }

    // Fetch full institution state for provisioning check
    const { data: fullInst } = await admin
      .from('institutions')
      .select('id, name, control_status, provisioned_at, approved_at')
      .eq('id', id)
      .single()

    // Update institution
    const instUpdates = { control_status: newStatus }
    if (newStatus === 'active' || newStatus === 'trial' || newStatus === 'grace_period') {
      instUpdates.is_active = true
      if (!fullInst?.approved_at) {
        instUpdates.approved_at = new Date().toISOString()
        instUpdates.approved_by = cu.id
      }
    }
    if (newStatus === 'suspended' || newStatus === 'cancelled' || newStatus === 'expired') {
      instUpdates.is_active = false
    }

    const [{ error: updErr }] = await Promise.all([
      admin.from('institutions').update(instUpdates).eq('id', id),
      admin.from('institution_status_history').insert({
        institution_id: id,
        old_status: inst.control_status,
        new_status: newStatus,
        changed_by: cu.id,
        reason: reason || null,
      }),
    ])

    if (updErr) throw new Error(updErr.message)

    await writeAuditLog(cu, `institution.${newStatus}`, 'institution', id, inst.name, { old: inst.control_status, new: newStatus, reason })

    const needsProvisioning = (newStatus === 'active' || newStatus === 'trial') && !fullInst?.provisioned_at
    return Response.json({ ok: true, status: newStatus, needs_provisioning: needsProvisioning })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
