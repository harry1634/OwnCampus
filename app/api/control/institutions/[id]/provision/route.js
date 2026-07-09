/**
 * POST /api/control/institutions/[id]/provision
 *
 * Validates the request synchronously (inputs, institution state, idempotency),
 * then enqueues the full provisioning work as an Inngest background job.
 *
 * If Inngest is not configured (local dev without inngest-cli), falls back to
 * running provisionInstitution() synchronously so the app still works.
 *
 * The HTTP response is always 200 OK if the job was accepted / work succeeded,
 * so the Control Center UI sees a success and can update its local state.
 */

import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                  from '@/lib/supabase/admin'
import { provisionInstitution }               from '@/lib/provisioning'
import { inngest }                            from '@/lib/inngest/client'
import logger                                 from '@/lib/logger'

export async function POST(req, { params }) {
  const log = logger.child({ route: '/api/control/institutions/[id]/provision' })
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const body   = await req.json()
    const admin  = createAdminClient()

    const { admin_email, admin_name } = body
    if (!admin_email?.trim()) {
      return Response.json({ error: 'admin_email is required.' }, { status: 400 })
    }
    if (!admin_name?.trim()) {
      return Response.json({ error: 'admin_name is required.' }, { status: 400 })
    }

    // Synchronous validation — check institution state before enqueuing
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

    // ── Enqueue background job via Inngest ──────────────────────────────────
    try {
      await inngest.send({
        name: 'institution/provision',
        data: {
          institutionId:  id,
          adminEmail:     admin_email.trim(),
          adminName:      admin_name.trim(),
          companyUserId:  cu.id,
        },
      })

      log.info({ institutionId: id, adminEmail: admin_email.trim() }, 'Provision job enqueued')

      await writeAuditLog(cu, 'institution.provision_queued', 'institution', id, inst.name, {
        admin_email: admin_email.trim(),
        admin_name:  admin_name.trim(),
        mode:        'inngest',
      })

      return Response.json({
        ok:               true,
        institution_name: inst.name,
        institution_code: inst.code,
        admin_email:      admin_email.trim(),
        message:          'Provisioning started in background. Welcome email will be sent to admin shortly.',
      })
    } catch (inngestErr) {
      // Inngest not reachable (e.g., no dev server running locally) — fall back to sync
      log.warn({ err: inngestErr, institutionId: id }, 'Inngest unavailable, falling back to sync provision')
    }

    // ── Synchronous fallback ────────────────────────────────────────────────
    const result = await provisionInstitution(id, admin_email.trim(), admin_name.trim(), cu.id)

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 })
    }

    await writeAuditLog(cu, 'institution.provisioned', 'institution', id, inst.name, {
      admin_email: admin_email.trim(),
      admin_name:  admin_name.trim(),
      mode:        'sync_fallback',
    })

    return Response.json({
      ok:               true,
      institution_name: inst.name,
      institution_code: inst.code,
      admin_email:      admin_email.trim(),
      message:          'Institution provisioned. Welcome email sent to admin.',
    })
  } catch (err) {
    log.error({ err }, 'Provision route threw')
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
