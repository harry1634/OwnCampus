/**
 * POST /api/students/import
 * Body: { students: [{ name, email, roll, class, parent, phone }] }
 *
 * Small imports (≤ SYNC_THRESHOLD rows): processed synchronously.
 *   Returns: { success, created, skipped, errors, details }
 *
 * Large imports (> SYNC_THRESHOLD rows): enqueued as an Inngest background job.
 *   Returns: { jobId, status: 'queued', total, created: 0, skipped: 0, errors: 0 }
 *   Poll progress at: GET /api/students/import/status/[jobId]
 */

import { randomBytes }        from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { rateLimitResponse } from '@/lib/rateLimit'
import { inngest }            from '@/lib/inngest/client'
import logger                 from '@/lib/logger'

// Imports ≤ this many rows run synchronously; larger jobs go to Inngest
const SYNC_THRESHOLD = 50

export const dynamic = 'force-dynamic'

export async function POST(req) {
  const log = logger.child({ route: '/api/students/import' })
  try {
    const limited = await rateLimitResponse(req, 5, 60_000)  // 5 bulk imports/min per IP
    if (limited) return limited

    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const adminRoles = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator']
    if (!adminRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const institutionId = profile?.institution_id
    if (!institutionId) return Response.json({ error: 'No institution found' }, { status: 400 })

    const { students: rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'students[] is required and must not be empty' }, { status: 400 })
    }

    // ── Large import → background job ──────────────────────────────────────
    if (rows.length > SYNC_THRESHOLD) {
      log.info({ institutionId, userId: user.id, total: rows.length }, 'Large import — enqueuing background job')

      // Create import_jobs row (stores row data so Inngest doesn't hit payload limits)
      const { data: job, error: jobErr } = await admin
        .from('import_jobs')
        .insert({
          institution_id: institutionId,
          status:         'queued',
          total:          rows.length,
          row_data:       rows,
        })
        .select('id')
        .single()

      if (jobErr || !job) {
        log.error({ err: jobErr }, 'Failed to create import_jobs row')
        return Response.json({ error: 'Failed to create import job.' }, { status: 500 })
      }

      // Enqueue Inngest event (falls back to inline if Inngest unavailable)
      try {
        await inngest.send({
          name: 'students/import',
          data: { jobId: job.id, institutionId },
        })
        log.info({ jobId: job.id, total: rows.length }, 'Import job enqueued')
      } catch (inngestErr) {
        // Inngest not reachable — mark job as failed and fall through to sync
        log.warn({ err: inngestErr }, 'Inngest unavailable, processing import synchronously')
        await admin.from('import_jobs').update({ status: 'failed', error_details: [{ error: 'Inngest unavailable, processed synchronously' }] }).eq('id', job.id)

        // Fall through to synchronous processing below (rows is still available)
        return await _processSync(rows, institutionId, admin, log)
      }

      return Response.json({
        jobId:   job.id,
        status:  'queued',
        total:   rows.length,
        created: 0,
        skipped: 0,
        errors:  0,
        message: `Import queued. ${rows.length} students will be processed in the background. Poll /api/students/import/status/${job.id} for progress.`,
      })
    }

    // ── Small import → synchronous ──────────────────────────────────────────
    return _processSync(rows, institutionId, admin, log)
  } catch (err) {
    log.error({ err }, 'Import route threw')
    return Response.json({ error: err.message }, { status: 500 })
  }
}

async function _processSync(rows, institutionId, admin, log) {
  const results = { created: [], skipped: [], errors: [] }

  for (const row of rows) {
    const email = (row.email || '').trim().toLowerCase()
    const name  = (row.name  || '').trim()
    if (!email) { results.skipped.push(row.name || '(no name)'); continue }
    if (!name)  { results.skipped.push(email); continue }

    try {
      const nameParts = name.split(/\s+/)
      const firstName = nameParts[0]
      const lastName  = nameParts.slice(1).join(' ') || ''

      const { data: existing } = await admin
        .from('user_profiles').select('id').eq('email', email).maybeSingle()

      let userId
      if (existing) {
        userId = existing.id
      } else {
        const tempPassword = `OC${randomBytes(6).toString('hex')}!`
        const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
          email,
          password:      tempPassword,
          email_confirm: true,
        })
        if (authErr) { results.errors.push({ name, error: authErr.message }); continue }
        userId = newUser.user.id

        await admin.from('user_profiles').upsert({
          id:             userId,
          email,
          first_name:     firstName,
          last_name:      lastName || null,
          role:           'student',
          institution_id: institutionId,
          phone:          row.phone || null,
          avatar_url:     row.photo_url || null,
          metadata: {
            roll_number:   row.roll   || null,
            class_section: row.class  || null,
            parent_name:   row.parent || null,
            import_source: 'csv',
          },
        }, { onConflict: 'id' })
      }

      let classId = null
      if (row.class) {
        const raw     = row.class.replace(/^class\s+/i, '').trim()
        const dashIdx = raw.lastIndexOf('-')
        const clsName = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw
        const section = dashIdx > -1 ? raw.slice(dashIdx + 1).trim() : null
        let cq = admin.from('classes').select('id').eq('institution_id', institutionId).ilike('name', clsName)
        if (section) cq = cq.ilike('section', section)
        const { data: cls } = await cq.maybeSingle()
        classId = cls?.id || null
      }

      await admin.from('students').upsert({
        user_id:        userId,
        institution_id: institutionId,
        roll_number:    row.roll   || null,
        parent_name:    row.parent || null,
        parent_phone:   row.phone  || null,
        class_id:       classId,
        status:         'active',
      }, { onConflict: 'user_id' })

      results.created.push(name)
    } catch (err) {
      results.errors.push({ name: row.name || email, error: err.message })
    }
  }

  log.info({ institutionId, created: results.created.length, skipped: results.skipped.length, errors: results.errors.length }, 'Sync import complete')

  return Response.json({
    success:  results.errors.length === 0,
    created:  results.created.length,
    skipped:  results.skipped.length,
    errors:   results.errors.length,
    details:  results,
  })
}
