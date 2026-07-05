/**
 * POST /api/control/institutions/[id]/provision
 *
 * Runs the full onboarding provisioning for an approved institution.
 * Body: { admin_email, admin_name }
 *
 * Idempotent — returns early if already provisioned.
 */

import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                  from '@/lib/supabase/admin'
import { provisionInstitution }               from '@/lib/provisioning'

export async function POST(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const body  = await req.json()
    const admin = createAdminClient()

    const { admin_email, admin_name } = body
    if (!admin_email?.trim()) {
      return Response.json({ error: 'admin_email is required.' }, { status: 400 })
    }
    if (!admin_name?.trim()) {
      return Response.json({ error: 'admin_name is required.' }, { status: 400 })
    }

    // Verify institution exists and is in an approvable state
    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, code, control_status, provisioned_at')
      .eq('id', id)
      .single()

    if (!inst) {
      return Response.json({ error: 'Institution not found.' }, { status: 404 })
    }

    if (inst.provisioned_at) {
      return Response.json({ error: 'Institution is already provisioned.', already_provisioned: true }, { status: 409 })
    }

    const PROVISIONABLE = ['trial', 'active']
    if (!PROVISIONABLE.includes(inst.control_status)) {
      return Response.json({
        error: `Institution must be in 'trial' or 'active' status to provision. Current: '${inst.control_status}'.`
      }, { status: 400 })
    }

    // Run full provisioning
    const result = await provisionInstitution(id, admin_email.trim(), admin_name.trim(), cu.id)

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 })
    }

    await writeAuditLog(cu, 'institution.provisioned', 'institution', id, inst.name, {
      admin_email: admin_email.trim(),
      admin_name:  admin_name.trim(),
    })

    return Response.json({
      ok:               true,
      institution_name: inst.name,
      institution_code: inst.code,
      admin_email:      admin_email.trim(),
      // tempPassword is NOT returned in the response — it goes in the email only
      message:          'Institution provisioned. Welcome email sent to admin.',
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
