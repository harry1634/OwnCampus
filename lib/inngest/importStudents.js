/**
 * lib/inngest/importStudents.js
 * Background job: bulk student import.
 *
 * Triggered by event: students/import
 * Event data: { jobId, institutionId }
 *
 * Reads row data from import_jobs.row_data, processes them in batches of 20,
 * and writes progress back to import_jobs after each batch.
 * Each batch is a separate Inngest step — if interrupted, Inngest resumes
 * from the last completed batch rather than reprocessing earlier rows.
 */

import { randomBytes }        from 'crypto'
import { inngest }             from '@/lib/inngest/client'
import { createAdminClient }  from '@/lib/supabase/admin'
import logger                 from '@/lib/logger'

const BATCH_SIZE = 20

export const importStudentsFunction = inngest.createFunction(
  {
    id:       'students-bulk-import',
    name:     'Bulk Student Import',
    retries:  1,
    triggers: { event: 'students/import' },
  },
  async ({ event, step }) => {
    const { jobId, institutionId } = event.data

    const log = logger.child({
      job:           'students-bulk-import',
      jobId,
      institutionId,
      inngestEventId: event.id,
    })

    // ── 1. Load row data from import_jobs ──────────────────────────────────
    const { rows, total } = await step.run('load-job', async () => {
      const admin = createAdminClient()
      const { data: job, error } = await admin
        .from('import_jobs')
        .select('row_data, total')
        .eq('id', jobId)
        .single()

      if (error || !job) throw new Error(`Import job ${jobId} not found`)

      // Mark as processing
      await admin
        .from('import_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', jobId)

      return { rows: job.row_data || [], total: job.total }
    })

    log.info({ total }, 'Import job loaded, processing rows')

    // ── 2. Process rows in batches ─────────────────────────────────────────
    const admin    = createAdminClient()
    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors  = 0
    const errorDetails = []

    const numBatches = Math.ceil(rows.length / BATCH_SIZE)

    for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
      const batch = rows.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE)

      const batchResult = await step.run(`process-batch-${batchIdx}`, async () => {
        let created = 0, skipped = 0, errors = 0
        const batchErrors = []

        for (const row of batch) {
          const email = (row.email || '').trim().toLowerCase()
          const name  = (row.name  || '').trim()

          if (!email) { skipped++; continue }
          if (!name)  { skipped++; continue }

          try {
            const nameParts = name.split(/\s+/)
            const firstName = nameParts[0]
            const lastName  = nameParts.slice(1).join(' ') || ''

            // Check if user already exists
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
              if (authErr) {
                batchErrors.push({ name, error: authErr.message })
                errors++
                continue
              }
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
                  import_job_id: jobId,
                },
              }, { onConflict: 'id' })
            }

            // Resolve class_id
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

            created++
          } catch (err) {
            batchErrors.push({ name: row.name || email, error: err.message })
            errors++
          }
        }

        return { created, skipped, errors, batchErrors }
      })

      totalCreated += batchResult.created
      totalSkipped += batchResult.skipped
      totalErrors  += batchResult.errors
      errorDetails.push(...batchResult.batchErrors)

      // Write progress after each batch
      await step.run(`update-progress-${batchIdx}`, async () => {
        await admin.from('import_jobs').update({
          created:      totalCreated,
          skipped:      totalSkipped,
          errors:       totalErrors,
          processed:    Math.min((batchIdx + 1) * BATCH_SIZE, total),
        }).eq('id', jobId)
      })

      log.debug({ batchIdx: batchIdx + 1, numBatches, totalCreated, totalErrors }, 'Batch complete')
    }

    // ── 3. Mark job complete ───────────────────────────────────────────────
    await step.run('mark-complete', async () => {
      await admin.from('import_jobs').update({
        status:       'completed',
        created:      totalCreated,
        skipped:      totalSkipped,
        errors:       totalErrors,
        processed:    total,
        error_details: errorDetails.length > 0 ? errorDetails : null,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
    })

    log.info({ totalCreated, totalSkipped, totalErrors }, 'Import job completed')

    return {
      jobId,
      created: totalCreated,
      skipped: totalSkipped,
      errors:  totalErrors,
    }
  }
)
