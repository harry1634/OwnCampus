/**
 * lib/inngest/provision.js
 * Background job: full institution onboarding.
 *
 * Triggered by event: institution/provision
 * Event data: { institutionId, adminEmail, adminName, companyUserId }
 *
 * Runs the same provisionInstitution() logic as before, but outside the
 * HTTP request lifecycle. If the step fails, Inngest retries up to 3 times
 * with exponential backoff before marking the run as failed.
 */

import { inngest }             from '@/lib/inngest/client'
import { provisionInstitution } from '@/lib/provisioning'
import { createAdminClient }   from '@/lib/supabase/admin'
import logger                  from '@/lib/logger'

export const provisionFunction = inngest.createFunction(
  {
    id:       'institution-provision',
    name:     'Provision Institution',
    retries:  3,
    triggers: { event: 'institution/provision' },
  },
  async ({ event, step }) => {
    const { institutionId, adminEmail, adminName, companyUserId } = event.data

    const log = logger.child({
      job:           'institution-provision',
      institutionId,
      inngestEventId: event.id,
    })

    log.info({ adminEmail }, 'Provisioning started')

    // step.run creates a checkpoint — if the function is interrupted here,
    // Inngest resumes from this step rather than restarting from scratch.
    const result = await step.run('run-provision', async () => {
      return provisionInstitution(institutionId, adminEmail, adminName, companyUserId)
    })

    if (!result.ok) {
      log.error({ error: result.error }, 'Provisioning failed')
      throw new Error(`Provisioning failed: ${result.error}`)
    }

    // Stamp the institutions row with the Inngest run ID for traceability
    await step.run('stamp-event-id', async () => {
      const admin = createAdminClient()
      await admin
        .from('institutions')
        .update({ metadata: { inngest_provision_event_id: event.id } })
        .eq('id', institutionId)
        .is('metadata', null)  // only if metadata is null (don't overwrite existing)
    })

    log.info({ adminEmail }, 'Provisioning completed')
    return { ok: true, institutionId, adminEmail }
  }
)
