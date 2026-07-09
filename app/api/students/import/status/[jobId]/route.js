/**
 * GET /api/students/import/status/[jobId]
 * Returns the current status and progress of a background import job.
 *
 * Response shape:
 *   { jobId, status, total, processed, created, skipped, errors, completedAt?, errorDetails? }
 *
 * Status values: queued | processing | completed | failed
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    if (!jobId) return Response.json({ error: 'jobId is required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify the job belongs to the caller's institution
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    if (!profile?.institution_id) {
      return Response.json({ error: 'No institution found' }, { status: 400 })
    }

    const { data: job, error } = await admin
      .from('import_jobs')
      .select('id, status, total, processed, created, skipped, errors, error_details, created_at, started_at, completed_at')
      .eq('id', jobId)
      .eq('institution_id', profile.institution_id)
      .single()

    if (error || !job) {
      return Response.json({ error: 'Import job not found.' }, { status: 404 })
    }

    const progressPct = job.total > 0
      ? Math.round((job.processed / job.total) * 100)
      : 0

    return Response.json({
      jobId:        job.id,
      status:       job.status,
      total:        job.total,
      processed:    job.processed,
      created:      job.created,
      skipped:      job.skipped,
      errors:       job.errors,
      progressPct,
      createdAt:    job.created_at,
      startedAt:    job.started_at,
      completedAt:  job.completed_at,
      errorDetails: job.error_details || [],
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
